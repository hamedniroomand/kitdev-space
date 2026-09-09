import { getClientKey } from '#server/utils/network/client-ip'
import { fetchHtmlDocument } from '#server/utils/network/fetch-html'
import { extractOgFromHtml, inspectOgImage } from '#server/utils/network/og'
import { enforceRateLimit } from '#server/utils/network/rate-limit'
import { resolveUserAgent } from '#shared/utils/network/og-meta'

interface OgPreviewBody {
  url?: string
  /** A key of `OG_USER_AGENTS`. An unknown key gives the browser string. */
  userAgent?: string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'network:og')

  const body = await readBody<OgPreviewBody>(event)
  const url = body.url ?? ''

  try {
    const { html, finalUrl, charset } = await fetchHtmlDocument(url, {
      userAgent: resolveUserAgent(body.userAgent),
    })
    const data = await extractOgFromHtml(html, finalUrl)
    const imageCheck = data.image ? await inspectOgImage(data.image) : null

    return { result: { ...data, charset, imageCheck } }
  }
  catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'statusCode' in cause) {
      throw cause
    }
    const message = cause instanceof Error ? cause.message : 'The OpenGraph preview failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
