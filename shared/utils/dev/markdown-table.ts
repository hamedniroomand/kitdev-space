export type ColumnAlign = 'left' | 'center' | 'right'

export interface MarkdownTableOptions {
  headers: string[]
  alignments?: ColumnAlign[]
  rows: string[][]
  pretty?: boolean
}

export function escapeTableCell(cell: string): string {
  return cell.replace(/(\\*)(\|)/g, (match, backslashes, pipe) => {
    if (backslashes.length % 2 === 1) {
      return match
    }
    return `${backslashes}\\${pipe}`
  })
}

export function formatMarkdownTable(options: MarkdownTableOptions): string {
  const { headers, alignments = [], rows, pretty = true } = options

  if (headers.length === 0) {
    return ''
  }

  const colCount = headers.length
  const normalizedAlignments: ColumnAlign[] = Array.from({ length: colCount }, (_, i) => alignments[i] || 'left')

  const sanitizedHeaders = headers.map(h => escapeTableCell(h.trim()))
  const sanitizedRows = rows.map(row =>
    Array.from({ length: colCount }, (_, i) => escapeTableCell((row[i] || '').trim())),
  )

  // Calculate max widths for pretty formatting using escaped cells
  const colWidths: number[] = sanitizedHeaders.map((h, i) => {
    let max = Math.max(3, h.length)
    for (const row of sanitizedRows) {
      const cell = row[i] || ''
      max = Math.max(max, cell.length)
    }
    return max
  })

  const pad = (text: string, width: number, align: ColumnAlign): string => {
    if (!pretty)
      return text
    const diff = Math.max(0, width - text.length)
    if (align === 'right') {
      return ' '.repeat(diff) + text
    }
    if (align === 'center') {
      const left = Math.floor(diff / 2)
      const right = diff - left
      return ' '.repeat(left) + text + ' '.repeat(right)
    }
    return text + ' '.repeat(diff)
  }

  // Header line
  const headerLine = `| ${sanitizedHeaders.map((h, i) => pad(h, colWidths[i]!, normalizedAlignments[i]!)).join(' | ')} |`

  // Separator line
  const separatorLine = `| ${colWidths
    .map((w, i) => {
      const align = normalizedAlignments[i]
      const dashes = Math.max(3, w)
      if (align === 'center')
        return `:${'-'.repeat(dashes - 2)}:`
      if (align === 'right')
        return `${'-'.repeat(dashes - 1)}:`
      return `:${'-'.repeat(dashes - 1)}`
    })
    .join(' | ')} |`

  // Row lines
  const rowLines = sanitizedRows.map(
    row => `| ${row.map((cell, i) => pad(cell, colWidths[i]!, normalizedAlignments[i]!)).join(' | ')} |`,
  )

  return [headerLine, separatorLine, ...rowLines].join('\n')
}
