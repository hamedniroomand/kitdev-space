import { describe, expect, it } from 'vitest'
import {
  deriveMarkdownFilename,
  extractMarkdownHeading,
  generateHtmlDocument,
  parseMarkdown,
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

describe('extractMarkdownHeading', () => {
  it('extracts the first # Heading in the document', () => {
    expect(extractMarkdownHeading('# Project Roadmap\n\nSome intro text')).toBe('Project Roadmap')
  })

  it('ignores subheadings that appear before the first # Heading', () => {
    const input = '## Intro Section\n\n### Minor Details\n\n# Actual Main Title\n\nText'
    expect(extractMarkdownHeading(input)).toBe('Actual Main Title')
  })

  it('strips markdown formatting and trailing hashes from the heading', () => {
    expect(extractMarkdownHeading('# **Bold Title** ##')).toBe('Bold Title')
    expect(extractMarkdownHeading('# *Italic Notes*')).toBe('Italic Notes')
  })

  it('returns null when document has no # Heading', () => {
    expect(extractMarkdownHeading('Just plain text without headers')).toBeNull()
    expect(extractMarkdownHeading('## Only level 2 header')).toBeNull()
    expect(extractMarkdownHeading('')).toBeNull()
  })
})

describe('deriveMarkdownFilename', () => {
  it('derives download filename from the first # Heading', () => {
    const md = '# Markdown Live Studio\n\nSome body text'
    expect(deriveMarkdownFilename(md, 'html')).toBe('markdown-live-studio.html')
  })

  it('sanitizes punctuation and whitespace into clean hyphenated slugs', () => {
    const md = '# 2026 Q3: Financial Report & Analysis!\n\nDetails'
    expect(deriveMarkdownFilename(md, 'html')).toBe('2026-q3-financial-report-analysis.html')
  })

  it('falls back to default filename when no # Heading exists', () => {
    expect(deriveMarkdownFilename('No heading here', 'html', 'my-doc')).toBe('my-doc.html')
    expect(deriveMarkdownFilename('', 'html')).toBe('document.html')
  })

  it('supports custom extension like .md', () => {
    const md = '# Personal Notes\n\nMy thoughts'
    expect(deriveMarkdownFilename(md, 'md')).toBe('personal-notes.md')
  })
})
