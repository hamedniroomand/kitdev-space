// @vitest-environment happy-dom
import type { OgImageProbe } from '#shared/utils/network/og-meta'
import { describe, expect, it } from 'vitest'
import {
  auditOgData,
  buildMetaTagSnippet,
  OG_USER_AGENTS,
  resolveUserAgent,
} from '#shared/utils/network/og-meta'
import { canExtractOgInBrowser, extractOgInBrowser } from '~/utils/network/og-dom'

// The same document and the same result run in `tests/bun/network/og.test.ts`
// against the `HTMLRewriter` path. Both paths must give one result.
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

function probe(patch: Partial<OgImageProbe> = {}): OgImageProbe {
  return {
    url: 'https://example.com/images/banner.jpg',
    ok: true,
    contentType: 'image/png',
    byteSize: 120_000,
    width: 1200,
    height: 630,
    error: null,
    ...patch,
  }
}

function levelOf(findings: ReturnType<typeof auditOgData>, id: string) {
  return findings.find(item => item.id === id)?.level
}

describe('extractOgInBrowser', () => {
  it('reads the same tags as the server path', () => {
    expect(canExtractOgInBrowser()).toBe(true)
    expect(extractOgInBrowser(parityHtml, 'https://example.com/blog/article')).toEqual(parityData)
  })

  it('falls back to the title element', () => {
    const data = extractOgInBrowser('<html><head><title> Page Title </title></head></html>', 'https://example.com')
    expect(data.title).toBe('Page Title')
    expect(data.url).toBe('https://example.com')
  })

  it('does not fail a relative path when the page URL is empty', () => {
    const data = extractOgInBrowser(parityHtml, '')
    expect(data.image).toBe('/images/banner.jpg')

    const findings = auditOgData(data)
    expect(levelOf(findings, 'image')).toBe('info')
    expect(findings.some(item => item.level === 'error')).toBe(false)
  })

  it('keeps the first tag when a key repeats', () => {
    const html = `<html><head>
      <meta property="og:title" content="First">
      <meta property="og:title" content="Second">
    </head></html>`
    expect(extractOgInBrowser(html, 'https://example.com').title).toBe('First')
  })
})

describe('auditOgData', () => {
  it('reports a correct page with a correct image', () => {
    const findings = auditOgData(parityData, probe())
    expect(findings.every(item => item.level === 'ok')).toBe(true)
  })

  it('reports each missing tag with a fix', () => {
    const findings = auditOgData({
      title: '',
      description: '',
      image: '',
      imageAlt: '',
      url: '',
      canonical: '',
      siteName: '',
      type: '',
      twitterCard: '',
    })

    expect(levelOf(findings, 'title')).toBe('error')
    expect(levelOf(findings, 'description')).toBe('error')
    expect(levelOf(findings, 'image')).toBe('error')
    expect(levelOf(findings, 'twitter-card')).toBe('warning')
    expect(levelOf(findings, 'canonical')).toBe('warning')
    expect(findings.every(item => item.level === 'ok' || item.fix !== null)).toBe(true)
  })

  it('warns about a long title and a long description', () => {
    const findings = auditOgData({
      ...parityData,
      title: 'T'.repeat(61),
      description: 'D'.repeat(201),
    })
    expect(levelOf(findings, 'title')).toBe('warning')
    expect(levelOf(findings, 'description')).toBe('warning')
  })

  it('validates the content type, the byte size, and the pixel size', () => {
    expect(levelOf(auditOgData(parityData, probe({ contentType: 'text/html' })), 'image-content-type')).toBe('error')
    expect(levelOf(auditOgData(parityData, probe({ byteSize: 6_000_000 })), 'image-size')).toBe('warning')
    expect(levelOf(auditOgData(parityData, probe({ width: 100, height: 100 })), 'image-dimensions')).toBe('error')
    expect(levelOf(auditOgData(parityData, probe({ width: 800, height: 418 })), 'image-dimensions')).toBe('warning')
    expect(levelOf(auditOgData(parityData, probe({ ok: false, error: 'Not found.' })), 'image-unreachable')).toBe('error')
  })

  it('does not fail the image when the browser cannot check it', () => {
    const findings = auditOgData(parityData)
    expect(levelOf(findings, 'image-not-checked')).toBe('info')
    expect(findings.some(item => item.level === 'error')).toBe(false)
  })
})

describe('buildMetaTagSnippet', () => {
  it('keeps a correct value and fills a gap', () => {
    const data = { ...parityData, description: '', twitterCard: '' }
    const snippet = buildMetaTagSnippet(data, auditOgData(data))

    expect(snippet).toContain('<meta property="og:title" content="OG Title">')
    expect(snippet).toContain('<meta property="og:description" content="Add a description of 200 characters or less">')
    expect(snippet).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(snippet).toContain('<link rel="canonical" href="https://example.com/post/1">')
    expect(snippet).toContain('<meta property="og:type" content="article">')
  })

  it('escapes a quote in a value', () => {
    const data = { ...parityData, title: 'A "quoted" title' }
    expect(buildMetaTagSnippet(data, auditOgData(data))).toContain('content="A &quot;quoted&quot; title"')
  })
})

describe('resolveUserAgent', () => {
  it('maps a known key and falls back to the browser string', () => {
    expect(resolveUserAgent('twitter')).toBe(OG_USER_AGENTS.twitter)
    expect(resolveUserAgent('facebook')).toContain('facebookexternalhit')
    expect(resolveUserAgent('curl/8.0')).toBe(OG_USER_AGENTS.browser)
    expect(resolveUserAgent(undefined)).toBe(OG_USER_AGENTS.browser)
  })
})
