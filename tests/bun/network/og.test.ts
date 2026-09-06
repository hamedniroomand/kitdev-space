import { describe, expect, it } from 'bun:test'
import { extractOgFromHtml } from '#server/utils/network/og'

const html = `<!doctype html><html><head>
<title>Fallback Title</title>
<meta property="og:title" content="OG Title" />
<meta property="og:description" content="OG Desc" />
<meta property="og:image" content="https://example.com/a.png" />
<meta property="og:site_name" content="Example" />
<meta name="twitter:card" content="summary_large_image" />
</head><body></body></html>`

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
})
