import { lookupDns, isDnsRecordType } from '#server/utils/network/dns'
import { inspectEmailHealth } from '#server/utils/network/email-health'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface DnsBody {
  domain?: string
  type?: string
  mode?: string
  dkimSelectors?: string[] | string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:dns')

  const body = await readBody<DnsBody>(event)
  const domain = body.domain ?? ''
  const mode = body.mode ?? 'lookup'

  if (mode === 'email-health') {
    try {
      const result = await inspectEmailHealth(domain, body.dkimSelectors)
      return { result }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The lookup failed.'
      throw createError({
        statusCode: 400,
        message
      })
    }
  }

  if (mode !== 'lookup') {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid mode.'
    })
  }

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
