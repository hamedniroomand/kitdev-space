import { lookupRdap } from '#server/utils/network/rdap'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface RdapBody {
  query?: string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'network:rdap')

  const body = await readBody<RdapBody>(event)
  const query = body.query?.trim() ?? ''

  if (!query) {
    throw createError({
      statusCode: 400,
      message: 'Enter a valid domain name or IP address.'
    })
  }

  try {
    const result = await lookupRdap(query)
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The RDAP lookup failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
