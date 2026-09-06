import { fetchHeaders } from '../../utils/network/http'
import { enforceRateLimit } from '../../utils/network/rate-limit'
import { analyzeSecurityHeaders } from '../../../shared/utils/network/security-headers'

interface HeadersBody {
  url?: string
  mode?: string
  origin?: string
  method?: string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:headers')

  const body = await readBody<HeadersBody>(event)
  const url = body.url ?? ''
  const mode = body.mode ?? 'headers'
  const origin = body.origin?.trim() || undefined
  const method = body.method === 'OPTIONS' ? 'OPTIONS' : undefined

  if (mode !== 'headers' && mode !== 'security') {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid mode: headers or security.'
    })
  }

  try {
    const result = await fetchHeaders(url, { origin, method })
    if (mode === 'security') {
      return {
        result: {
          ...result,
          security: analyzeSecurityHeaders(result.headers, {
            requestOrigin: origin ?? null
          })
        }
      }
    }
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The request failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
