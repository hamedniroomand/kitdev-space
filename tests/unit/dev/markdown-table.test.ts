import { describe, expect, it } from 'vitest'
import { formatMarkdownTable } from '#shared/utils/dev/markdown-table'

describe('formatMarkdownTable', () => {
  it('formats a 2x2 markdown table with alignment', () => {
    const table = formatMarkdownTable({
      headers: ['Name', 'Price'],
      alignments: ['left', 'right'],
      rows: [
        ['Apple', '$1.00'],
        ['Banana', '$0.50'],
      ],
    })

    expect(table).toContain('| Name   | Price |')
    expect(table).toContain('| :----- | ----: |')
    expect(table).toContain('| Apple  | $1.00 |')
    expect(table).toContain('| Banana | $0.50 |')
  })

  it('handles empty rows gracefully', () => {
    const table = formatMarkdownTable({
      headers: ['Col A', 'Col B'],
      rows: [],
    })
    expect(table).toContain('| Col A | Col B |')
  })
})
