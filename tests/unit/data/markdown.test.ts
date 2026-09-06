import { describe, expect, it } from 'vitest'
import {
  generateHtmlDocument,
  getMarkdownStats,
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

describe('getMarkdownStats', () => {
  it('calculates characters, words, and reading time for empty text', () => {
    const stats = getMarkdownStats('')
    expect(stats.characters).toBe(0)
    expect(stats.words).toBe(0)
    expect(stats.readingTime).toBe('< 1 min read')
  })

  it('calculates word count and reading time correctly', () => {
    const sample = 'One two three four five'
    const stats = getMarkdownStats(sample)
    expect(stats.characters).toBe(23)
    expect(stats.words).toBe(5)
    expect(stats.readingTime).toBe('< 1 min read')
  })

  it('scales reading time for larger texts', () => {
    const words = Array.from({ length: 450 }, () => 'word').join(' ')
    const stats = getMarkdownStats(words)
    expect(stats.words).toBe(450)
    expect(stats.readingTime).toBe('3 min read')
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
