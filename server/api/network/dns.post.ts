import { lookupDns, isDnsRecordType } from '../../utils/network/dns'
import { enforceRateLimit } from '../../utils/network/rate-limit'

interface DnsBody {
  domain?: string
  type?: string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:dns')

  const body = await readBody<DnsBody>(event)
  const domain = body.domain ?? ''
  const type = body.type ?? ''

  if (!isDnsRecordType(type)) {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid record type.'
    })
  }

  try {
    const result = await lookupDns(domain, type)
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The lookup failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
