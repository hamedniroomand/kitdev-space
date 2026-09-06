import { Resolver } from 'node:dns/promises'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'
import { analyzeIp } from '#shared/utils/network/ip-info'

const REVERSE_TIMEOUT_MS = 3000

export default defineEventHandler(async (event) => {
  const clientKey = getClientKey(event)
  enforceRateLimit(clientKey, 'network:ip-info')

  const query = getQuery(event)
  const queryIp = typeof query.ip === 'string' ? query.ip.trim() : ''

  const clientIp = clientKey === 'anonymous' ? '127.0.0.1' : clientKey
  const targetIp = queryIp || clientIp

  try {
    // `analyzeIp` throws on anything that is not a valid IP address, so only a
    // valid address reaches the resolver below.
    const info = analyzeIp(targetIp)

    let hostname: string | null = null
    try {
      // A bare `dns.reverse` has no timeout and can hold the function open.
      const resolver = new Resolver({ timeout: REVERSE_TIMEOUT_MS, tries: 1 })
      const hostnames = await resolver.reverse(targetIp)
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
