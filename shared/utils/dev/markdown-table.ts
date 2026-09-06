export type ColumnAlign = 'left' | 'center' | 'right'

export interface MarkdownTableOptions {
  headers: string[]
  alignments?: ColumnAlign[]
  rows: string[][]
  pretty?: boolean
}

export function formatMarkdownTable(options: MarkdownTableOptions): string {
  const { headers, alignments = [], rows, pretty = true } = options

  if (headers.length === 0) {
    return ''
  }

  const colCount = headers.length
  const normalizedAlignments: ColumnAlign[] = Array.from({ length: colCount }, (_, i) => alignments[i] || 'left')

  // Calculate max widths for pretty formatting
  const colWidths: number[] = headers.map((h, i) => {
    let max = Math.max(3, h.trim().length)
    for (const row of rows) {
      const cell = (row[i] || '').trim()
      max = Math.max(max, cell.length)
    }
    return max
  })

  const pad = (text: string, width: number, align: ColumnAlign): string => {
    if (!pretty) return text
    const trimmed = text.trim()
    const diff = Math.max(0, width - trimmed.length)
    if (align === 'right') {
      return ' '.repeat(diff) + trimmed
    }
    if (align === 'center') {
      const left = Math.floor(diff / 2)
      const right = diff - left
      return ' '.repeat(left) + trimmed + ' '.repeat(right)
    }
    return trimmed + ' '.repeat(diff)
  }

  // Header line
  const headerLine = `| ${headers.map((h, i) => pad(h, colWidths[i]!, normalizedAlignments[i]!)).join(' | ')} |`

  // Separator line
  const separatorLine = `| ${colWidths
    .map((w, i) => {
      const align = normalizedAlignments[i]
      const dashes = Math.max(3, w)
      if (align === 'center') return `:${'-'.repeat(dashes - 2)}:`
      if (align === 'right') return `${'-'.repeat(dashes - 1)}:`
      return `:${'-'.repeat(dashes - 1)}`
    })
    .join(' | ')} |`

  // Row lines
  const rowLines = rows.map(
    row => `| ${Array.from({ length: colCount }, (_, i) => pad(row[i] || '', colWidths[i]!, normalizedAlignments[i]!)).join(' | ')} |`
  )

  return [headerLine, separatorLine, ...rowLines].join('\n')
}
