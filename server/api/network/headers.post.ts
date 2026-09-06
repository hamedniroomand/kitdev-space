import { fetchHeaders, walkRedirects } from '#server/utils/network/http'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'
import { analyzeSecurityHeaders } from '#shared/utils/network/security-headers'

interface HeadersBody {
  url?: string
  origin?: string
  method?: string
}

/**
 * One request gives the headers, the security report, and the redirect chain.
 * The HTTP Inspector reads all three from one call.
 */
export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'network:headers')

  const body = await readBody<HeadersBody>(event)
  const url = body.url ?? ''
  const origin = body.origin?.trim() || undefined
  const method = body.method === 'OPTIONS' ? 'OPTIONS' : undefined

  try {
    const hops = await walkRedirects(url)
    // Read the headers of the final URL, not of the first redirect.
    const target = hops[hops.length - 1]?.url ?? url
    const result = await fetchHeaders(target, { origin, method })

    return {
      result: {
        ...result,
        hops,
        security: analyzeSecurityHeaders(result.headers, {
          requestOrigin: origin ?? null
        })
      }
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The request failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
