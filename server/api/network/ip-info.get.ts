import dns from 'node:dns/promises'
import { analyzeIp } from '#shared/utils/network/ip-info'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const queryIp = typeof query.ip === 'string' ? query.ip.trim() : ''

  const clientIp = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const targetIp = queryIp || clientIp

  try {
    const info = analyzeIp(targetIp)

    let hostname: string | null = null
    try {
      const hostnames = await dns.reverse(targetIp)
      if (hostnames.length > 0) {
        hostname = hostnames[0] || null
      }
    } catch {
      // Reverse DNS may fail or have no PTR record
    }

    return {
      ...info,
      hostname,
      clientIp
    }
  } catch (err) {
    throw createError({
      statusCode: 400,
      message: err instanceof Error ? err.message : 'Failed to analyze IP address.'
    })
  }
})
