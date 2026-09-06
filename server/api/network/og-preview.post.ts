import { fetchHtmlDocument } from '#server/utils/network/fetch-html'
import { extractOgFromHtml } from '#server/utils/network/og'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface OgPreviewBody {
  url?: string
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'network:og')

  const body = await readBody<OgPreviewBody>(event)
  const url = body.url ?? ''

  try {
    const { html, finalUrl } = await fetchHtmlDocument(url)
    const result = await extractOgFromHtml(html, finalUrl)
    return { result }
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'statusCode' in cause) {
      throw cause
    }
    const message = cause instanceof Error ? cause.message : 'The OpenGraph preview failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
