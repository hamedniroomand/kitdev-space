import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { extractOgFromHtml, inspectOgImage } from '#server/utils/network/og'

const html = `<!doctype html><html><head>
<title>Fallback Title</title>
<meta property="og:title" content="OG Title" />
<meta property="og:description" content="OG Desc" />
<meta property="og:image" content="https://example.com/a.png" />
<meta property="og:site_name" content="Example" />
<meta name="twitter:card" content="summary_large_image" />
</head><body></body></html>`

// The same document and the same result run in `tests/unit/network/og-meta.test.ts`
// against the `DOMParser` path. Both paths must give one result.
const parityHtml = `<!doctype html><html><head>
<title>Fallback Title</title>
<link rel="canonical" href="/post/1">
<meta property="og:title" content="OG Title">
<meta property="og:description" content="OG Desc">
<meta property="og:image" content="/images/banner.jpg">
<meta property="og:site_name" content="Example">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
</head><body></body></html>`

const parityData = {
  title: 'OG Title',
  description: 'OG Desc',
  image: 'https://example.com/images/banner.jpg',
  imageAlt: '',
  url: 'https://example.com/post/1',
  canonical: 'https://example.com/post/1',
  siteName: 'Example',
  type: 'article',
  twitterCard: 'summary_large_image',
}

/** A PNG file with an IHDR chunk only. It holds the pixel size. */
function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(8 + 8 + 13 + 4)
  bytes.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 0)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13, false)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  view.setUint32(16, width, false)
  view.setUint32(20, height, false)
  return bytes
}

describe('extractOgFromHtml', () => {
  it('reads open graph tags', async () => {
    const data = await extractOgFromHtml(html, 'https://example.com/page')
    expect(data.title).toBe('OG Title')
    expect(data.description).toBe('OG Desc')
    expect(data.image).toBe('https://example.com/a.png')
    expect(data.siteName).toBe('Example')
  })

  it('falls back to title when og:title is missing', async () => {
    const data = await extractOgFromHtml(
      '<html><head><title> Page Title </title></head></html>',
      'https://example.com',
    )
    expect(data.title).toBe('Page Title')
  })

  it('resolves relative og:image against pageUrl', async () => {
    const relativeHtml = '<html><head><meta property="og:image" content="/images/banner.jpg" /></head></html>'
    const data = await extractOgFromHtml(relativeHtml, 'https://example.com/blog/article')
    expect(data.image).toBe('https://example.com/images/banner.jpg')
  })

  it('reads the canonical link and matches the browser path', async () => {
    const data = await extractOgFromHtml(parityHtml, 'https://example.com/blog/article')
    expect(data).toEqual(parityData)
  })
})

describe('inspectOgImage', () => {
  let lookup: ReturnType<typeof spyOn<typeof Bun.dns, 'lookup'>>
  let fetchSpy: ReturnType<typeof spyOn<typeof Bun, 'fetch'>>

  beforeEach(() => {
    lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4, ttl: 0 },
    ])
    fetchSpy = spyOn(Bun, 'fetch')
  })

  afterEach(() => {
    lookup.mockRestore()
    fetchSpy.mockRestore()
  })

  it('reads the content type, the byte size, and the pixel size', async () => {
    const bytes = pngBytes(1200, 630)
    fetchSpy.mockResolvedValue(new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': String(bytes.byteLength) },
    }))

    const probe = await inspectOgImage('https://example.com/og.png')

    expect(probe.ok).toBe(true)
    expect(probe.contentType).toBe('image/png')
    expect(probe.byteSize).toBe(bytes.byteLength)
    expect(probe.width).toBe(1200)
    expect(probe.height).toBe(630)
  })

  it('reports an error status and does not throw', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))

    const probe = await inspectOgImage('https://example.com/missing.png')

    expect(probe.ok).toBe(false)
    expect(probe.error).toContain('404')
  })

  it('does not download an image from a private host', async () => {
    const probe = await inspectOgImage('http://127.0.0.1/og.png')

    expect(probe.ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
