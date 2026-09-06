import { inspectTlsCertificate } from '../../utils/network/tls'
import { enforceRateLimit } from '../../utils/network/rate-limit'

interface TlsBody {
  host?: string
  port?: number
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:tls')

  const body = await readBody<TlsBody>(event)
  const host = body.host?.trim() ?? ''
  const port = typeof body.port === 'number' && body.port > 0 && body.port <= 65535 ? body.port : 443

  if (!host) {
    throw createError({
      statusCode: 400,
      message: 'Enter a valid hostname.'
    })
  }

  try {
    const result = await inspectTlsCertificate(host, port)
    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The TLS inspection failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
