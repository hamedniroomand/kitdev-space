import type { OgImageProbe, OgMetaTag, OgPreviewData } from '#shared/utils/network/og-meta'
import { readImageMetadata } from '#shared/utils/image/exif'
import { buildOgData } from '#shared/utils/network/og-meta'
import { assertSafeUrl } from './ssrf'

export type { OgImageProbe, OgPreviewData }

const IMAGE_TIMEOUT_MS = 8000
/** Read cap for the image. The header of the file holds the pixel size. */
const MAX_IMAGE_BYTES = 3_000_000

/** Read the meta tags of an HTML string with `HTMLRewriter`. */
export async function extractOgFromHtml(html: string, pageUrl: string): Promise<OgPreviewData> {
  const tags: OgMetaTag[] = []
  let titleText = ''
  let canonical = ''

  const rewriter = new HTMLRewriter()
    .on('title', {
      text(text) {
        titleText += text.text
      },
    })
    .on('link', {
      element(element) {
        const rel = (element.getAttribute('rel') || '').toLowerCase()
        if (rel === 'canonical' && !canonical) {
          canonical = element.getAttribute('href') || ''
        }
      },
    })
    .on('meta', {
      element(element) {
        const key = element.getAttribute('property') || element.getAttribute('name') || ''
        const content = element.getAttribute('content') || ''
        if (key && content) {
          tags.push({ key, content })
        }
      },
    })

  await rewriter.transform(new Response(html)).arrayBuffer()

  return buildOgData({ tags, titleText, canonical }, pageUrl)
}

async function readCappedImage(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    return new Uint8Array(0)
  }

  const chunks: Uint8Array[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value) {
        continue
      }
      chunks.push(value)
      total += value.byteLength
      if (total >= MAX_IMAGE_BYTES) {
        break
      }
    }
  }
  finally {
    void reader.cancel().catch(() => {})
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/**
 * Download the image of `og:image` and read its content type, byte size, and
 * pixel size. The function reports an error in the result and does not throw,
 * so a bad image does not stop the preview.
 */
export async function inspectOgImage(imageUrl: string): Promise<OgImageProbe> {
  const probe: OgImageProbe = {
    url: imageUrl,
    ok: false,
    contentType: null,
    byteSize: null,
    width: null,
    height: null,
    error: null,
  }

  try {
    const safe = await assertSafeUrl(imageUrl)
    const response = await Bun.fetch(safe, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: { Accept: 'image/*,*/*;q=0.8' },
    })

    probe.contentType = response.headers.get('content-type')

    if (!response.ok) {
      void response.body?.cancel()
      probe.error = `The image request failed with status ${response.status}.`
      return probe
    }

    const declared = Number(response.headers.get('content-length'))
    const bytes = await readCappedImage(response)
    probe.byteSize = Number.isFinite(declared) && declared > 0 ? declared : bytes.byteLength

    const metadata = readImageMetadata(bytes)
    probe.width = metadata.width
    probe.height = metadata.height
    probe.ok = true
    return probe
  }
  catch (cause) {
    probe.error = cause instanceof Error ? cause.message : 'The image request failed.'
    return probe
  }
}
