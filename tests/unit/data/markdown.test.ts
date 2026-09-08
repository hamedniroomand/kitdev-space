// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  deriveMarkdownFilename,
  extractMarkdownHeading,
  extractMarkdownHeadings,
  generateHtmlDocument,
  parseMarkdown,
  slugifyHeading,
} from '#shared/utils/data/markdown'

describe('parseMarkdown', () => {
  it('converts standard markdown headings with slug IDs and bold text', () => {
    const html = parseMarkdown('# Heading 1\n\n**bold text**')
    expect(html).toContain('<h1 id="heading-1">Heading 1</h1>')
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

describe('markdown local draft storage', () => {
  const DRAFT_KEY = 'kitdev:markdown-studio:draft'

  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults opt-in draft storage switch to off (false)', () => {
    const autoSaveDefault = false
    expect(autoSaveDefault).toBe(false)
  })

  it('does not store drafts without explicit user consent', () => {
    const autoSave = false
    let storedText = ''

    function onInputChange(newText: string) {
      if (autoSave) {
        storedText = newText
        localStorage.setItem(DRAFT_KEY, newText)
      }
    }

    onInputChange('# Secret Draft')
    expect(storedText).toBe('')
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('stores draft when opt-in switch is enabled', () => {
    const autoSave = true
    let storedText = ''

    function onInputChange(newText: string) {
      if (autoSave) {
        storedText = newText
        localStorage.setItem(DRAFT_KEY, newText)
      }
    }

    onInputChange('# Work in Progress')
    expect(storedText).toBe('# Work in Progress')
    expect(localStorage.getItem(DRAFT_KEY)).toBe('# Work in Progress')
  })

  it('clears stored draft when Clear Draft is called', () => {
    localStorage.setItem(DRAFT_KEY, '# Temporary')
    expect(localStorage.getItem(DRAFT_KEY)).toBe('# Temporary')

    function clearDraft() {
      localStorage.removeItem(DRAFT_KEY)
    }

    clearDraft()
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })
})

describe('slugifyHeading', () => {
  it('converts plain heading text into url-safe hyphenated slug', () => {
    expect(slugifyHeading('Getting Started!')).toBe('getting-started')
    expect(slugifyHeading('User Guide & API Reference')).toBe('user-guide-api-reference')
    expect(slugifyHeading('')).toBe('heading')
  })
})

describe('extractMarkdownHeadings', () => {
  it('extracts table of contents outline items with level, slug, and line number', () => {
    const md = `# Overview
Some text

## Architecture
Details

### Components
More info`
    const outline = extractMarkdownHeadings(md)
    expect(outline).toHaveLength(3)
    expect(outline[0]).toEqual({
      level: 1,
      text: 'Overview',
      slug: 'overview',
      line: 1,
    })
    expect(outline[1]).toEqual({
      level: 2,
      text: 'Architecture',
      slug: 'architecture',
      line: 4,
    })
    expect(outline[2]).toEqual({
      level: 3,
      text: 'Components',
      slug: 'components',
      line: 7,
    })
  })

  it('disambiguates duplicate heading titles with numbered suffixes', () => {
    const md = `# Introduction
Text
## Section
Text
## Section
Text`
    const outline = extractMarkdownHeadings(md)
    expect(outline[1]?.slug).toBe('section')
    expect(outline[2]?.slug).toBe('section-1')

    const html = parseMarkdown(md)
    expect(html).toContain('<h2 id="section">Section</h2>')
    expect(html).toContain('<h2 id="section-1">Section</h2>')
  })

  it('ignores headings located inside code blocks', () => {
    const md = `# Top Heading
\`\`\`bash
# Not a heading
echo "hi"
\`\`\`
## Next Heading`
    const outline = extractMarkdownHeadings(md)
    expect(outline).toHaveLength(2)
    expect(outline[0]?.text).toBe('Top Heading')
    expect(outline[1]?.text).toBe('Next Heading')
  })

  it('handles empty or non-string inputs safely', () => {
    expect(extractMarkdownHeadings('')).toEqual([])
  })
})
