import { fetchHeaders } from '../../utils/network/http'
import { enforceRateLimit } from '../../utils/network/rate-limit'

interface HeadersBody {
  url?: string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:headers')

  const body = await readBody<HeadersBody>(event)
  const url = body.url ?? ''

  try {
    const result = await fetchHeaders(url)
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The request failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
