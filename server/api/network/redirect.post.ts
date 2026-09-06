import { walkRedirects } from '#server/utils/network/http'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface RedirectBody {
  url?: string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:redirect')

  const body = await readBody<RedirectBody>(event)
  const url = body.url ?? ''

  try {
    const result = await walkRedirects(url)
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The request failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
