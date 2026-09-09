import { getClientKey } from '#server/utils/network/client-ip'
import { lookupAllDns } from '#server/utils/network/dns'
import { inspectEmailHealth } from '#server/utils/network/email-health'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface DnsBody {
  domain?: string
  mode?: string
  dkimSelectors?: string[] | string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)

  const body = await readBody<DnsBody>(event)
  const domain = body.domain ?? ''
  const mode = body.mode ?? 'lookup'

  // Email Health makes many record lookups per run. It gets its own bucket so
  // that it cannot use up the tokens of a plain DNS lookup, and the reverse.
  if (mode === 'email-health') {
    enforceRateLimit(ip, 'network:email-health')

    try {
      const result = await inspectEmailHealth(domain, body.dkimSelectors)
      return { result }
    }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The lookup failed.'
      throw createError({
        statusCode: 400,
        message,
      })
    }
  }

  enforceRateLimit(ip, 'network:dns')

  if (mode !== 'lookup') {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid mode.',
    })
  }

  try {
    // One request reads every common record type. The page filters the result.
    const result = await lookupAllDns(domain)
    return { result }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The lookup failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
