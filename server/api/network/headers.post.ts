import { getClientKey } from '#server/utils/network/client-ip'
import { fetchHeaders, walkRedirects } from '#server/utils/network/http'
import { enforceRateLimit } from '#server/utils/network/rate-limit'
import { analyzeSecurityHeaders } from '#shared/utils/network/security-headers'

interface HeadersBody {
  url?: string
  origin?: string
  method?: string
  requestMethod?: string
}

const PREFLIGHT_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])

function preflightMethod(input?: string): string {
  const value = input?.trim().toUpperCase() ?? ''
  return PREFLIGHT_METHODS.has(value) ? value : 'GET'
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
  const preflight = body.method === 'OPTIONS'
  const requestMethod = preflightMethod(body.requestMethod)

  try {
    const hops = await walkRedirects(url)
    // Read the headers of the final URL, not of the first redirect.
    const target = hops[hops.length - 1]?.url ?? url
    // A preflight must not redirect, so it goes to the URL of the user.
    const result = await fetchHeaders(preflight ? url : target, {
      origin,
      method: preflight ? 'OPTIONS' : undefined,
      requestMethod,
    })

    return {
      result: {
        ...result,
        hops,
        checkedAt: new Date().toISOString(),
        requestedUrl: url,
        requestOrigin: origin ?? null,
        security: analyzeSecurityHeaders(result.headers, {
          requestOrigin: origin ?? null,
          requestMethod: preflight ? requestMethod : null,
          preflightStatus: preflight ? result.status : null,
        }),
      },
    }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The request failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
