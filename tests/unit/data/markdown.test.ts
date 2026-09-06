import { describe, expect, it } from 'vitest'
import {
  generateHtmlDocument,
  parseMarkdown
} from '#shared/utils/data/markdown'

describe('parseMarkdown', () => {
  it('converts standard markdown headings and bold text', () => {
    const html = parseMarkdown('# Heading 1\n\n**bold text**')
    expect(html).toContain('<h1>Heading 1</h1>')
    expect(html).toContain('<strong>bold text</strong>')
  })

  it('supports GitHub-Flavored Markdown tables and task lists', () => {
    const input = `
| Name | Type |
| --- | --- |
| foo | bar |

- [x] Done task
- [ ] Todo task

~~strikethrough~~
`
    const html = parseMarkdown(input)
    expect(html).toContain('<table>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('<del>strikethrough</del>')
  })

  it('handles empty input gracefully', () => {
    expect(parseMarkdown('')).toBe('')
  })
})

describe('generateHtmlDocument', () => {
  it('wraps HTML content in a valid HTML5 template with styles', () => {
    const doc = generateHtmlDocument('<h1>Sample</h1>', 'Custom Title')
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc).toContain('<meta charset="utf-8">')
    expect(doc).toContain('<title>Custom Title</title>')
    expect(doc).toContain('<h1>Sample</h1>')
    expect(doc).toContain('<style>')
  })
})
