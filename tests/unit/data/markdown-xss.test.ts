import { describe, expect, it } from 'vitest'
import { generateHtmlDocument, parseMarkdown } from '#shared/utils/data/markdown'

// The preview renders this output with `v-html`, so the output must never
// carry a live tag or an executable URL scheme.

describe('parseMarkdown escapes HTML in the input', () => {
  it.each([
    ['<img src=x onerror=alert(1)>', '<img'],
    ['<script>alert(1)</script>', '<script'],
    ['<svg onload=alert(1)>', '<svg'],
    ['<iframe src="https://evil.test"></iframe>', '<iframe'],
    ['text <b onmouseover=alert(1)>hover</b>', '<b '],
    ['<style>body{display:none}</style>', '<style'],
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
    '[v](vbscript:msgbox(1))',
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
    ['[mail](mailto:a@b.com)', 'mailto:a@b.com'],
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

describe('parseMarkdown permits verified safe HTML elements', () => {
  it('allows details and summary disclosure elements', () => {
    const input = '<details><summary>More info</summary>Collapsible text</details>'
    const html = parseMarkdown(input)

    expect(html).toContain('<details><summary>More info</summary>Collapsible text</details>')
  })

  it('allows details open state', () => {
    const input = '<details open><summary>Expanded</summary>Visible content</details>'
    const html = parseMarkdown(input)

    expect(html).toContain('<details open>')
  })

  it('rejects details elements carrying event handlers', () => {
    const input = '<details ontoggle=alert(1)><summary>Click</summary></details>'
    const html = parseMarkdown(input)

    expect(html).not.toContain('<details ontoggle')
    expect(html).toContain('&lt;details')
  })

  it('allows kbd keyboard input elements', () => {
    const input = 'Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy'
    const html = parseMarkdown(input)

    expect(html).toContain('<kbd>Ctrl</kbd>')
    expect(html).toContain('<kbd>C</kbd>')
  })

  it('rejects kbd elements carrying event handlers', () => {
    const input = '<kbd onmouseover=alert(1)>Key</kbd>'
    const html = parseMarkdown(input)

    expect(html).not.toContain('<kbd onmouseover')
    expect(html).toContain('&lt;kbd')
  })

  it('allows img tags with dimensions and safe schemes', () => {
    const input = '<img src="https://example.com/figure.png" width="400" height="300" alt="Diagram">'
    const html = parseMarkdown(input)

    expect(html).toContain('<img src="https://example.com/figure.png" alt="Diagram" width="400" height="300">')
  })

  it('allows img tags with percentage dimensions and lazy loading', () => {
    const input = '<img src="/assets/photo.webp" width="100%" loading="lazy" alt="Banner">'
    const html = parseMarkdown(input)

    expect(html).toContain('src="/assets/photo.webp"')
    expect(html).toContain('width="100%"')
    expect(html).toContain('loading="lazy"')
  })

  it('rejects img tags with onerror handlers', () => {
    const input = '<img src="https://example.com/pic.png" onerror="alert(1)" width="100">'
    const html = parseMarkdown(input)

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('rejects img tags with javascript URI schemes', () => {
    const input = '<img src="javascript:alert(document.domain)" width="100">'
    const html = parseMarkdown(input)

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('rejects img tags with dangerous data html schemes', () => {
    const input = '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" width="100">'
    const html = parseMarkdown(input)

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})

describe('exported HTML sanitization consistency', () => {
  it('applies identical sanitization to exported HTML documents', () => {
    const maliciousInput = '# Title\n\n<script>alert("xss")</script>\n<img src=x onerror=alert(1)>\n<details open><summary>Safe</summary><kbd>Ctrl</kbd></details>'
    const compiled = parseMarkdown(maliciousInput)
    const doc = generateHtmlDocument(compiled, 'Export Title')

    expect(doc).not.toContain('<script>')
    expect(doc).not.toContain('<img src=x onerror=')
    expect(doc).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;')
    expect(doc).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(doc).toContain('<details open>')
    expect(doc).toContain('<kbd>Ctrl</kbd>')
  })
})
