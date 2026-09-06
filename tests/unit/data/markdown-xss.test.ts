import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '#shared/utils/data/markdown'

// The preview renders this output with `v-html`, so the output must never
// carry a live tag or an executable URL scheme.

describe('parseMarkdown escapes HTML in the input', () => {
  it.each([
    ['<img src=x onerror=alert(1)>', '<img'],
    ['<script>alert(1)</script>', '<script'],
    ['<svg onload=alert(1)>', '<svg'],
    ['<iframe src="https://evil.test"></iframe>', '<iframe'],
    ['text <b onmouseover=alert(1)>hover</b>', '<b '],
    ['<style>body{display:none}</style>', '<style']
  ])('escapes %s', (source, liveTag) => {
    const html = parseMarkdown(source)

    expect(html).not.toContain(liveTag)
    expect(html).toContain('&lt;')
  })
})

describe('parseMarkdown drops executable link and image targets', () => {
  it.each([
    '[click](javascript:alert(1))',
    '[click](JaVaScRiPt:alert(1))',
    '[click](  javascript:alert(1))',
    '![i](javascript:alert(1))',
    '[d](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    '[v](vbscript:msgbox(1))'
  ])('drops the target of %s', (source) => {
    const html = parseMarkdown(source)

    expect(html.toLowerCase()).not.toContain('javascript:')
    expect(html.toLowerCase()).not.toContain('vbscript:')
    expect(html.toLowerCase()).not.toContain('data:text/html')
  })

  it('keeps the link text when it drops the target', () => {
    expect(parseMarkdown('[click me](javascript:alert(1))')).toContain('click me')
  })
})

describe('parseMarkdown keeps safe markdown', () => {
  it('keeps an https link and its hyphens', () => {
    const html = parseMarkdown('[ok](https://my-site.com/a-b?q=1)')

    expect(html).toContain('href="https://my-site.com/a-b?q=1"')
  })

  it('keeps an https image', () => {
    expect(parseMarkdown('![img](https://example.com/a-b.png)')).toContain('src="https://example.com/a-b.png"')
  })

  it.each([
    ['[rel](./docs/my-page.md)', './docs/my-page.md'],
    ['[anchor](#my-section)', '#my-section'],
    ['[mail](mailto:a@b.com)', 'mailto:a@b.com']
  ])('keeps %s', (source, expected) => {
    expect(parseMarkdown(source)).toContain(expected)
  })

  it('adds rel to outgoing links', () => {
    expect(parseMarkdown('[ok](https://example.com)')).toContain('rel="nofollow noopener noreferrer"')
  })

  it('still renders bold, code, and headings', () => {
    const html = parseMarkdown('# Title\n\n**bold** and `code`')

    expect(html).toContain('<h1')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>code</code>')
  })
})
