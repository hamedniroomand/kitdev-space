import { parseCsv } from '../data/csv'
import { DataError } from '../data/errors'

export type ColumnAlign = 'left' | 'center' | 'right'

export interface MarkdownTableOptions {
  headers: string[]
  alignments?: ColumnAlign[]
  rows: string[][]
  pretty?: boolean
}

export interface ParsedTable {
  headers: string[]
  alignments: ColumnAlign[]
  rows: string[][]
}

const LINE_BREAK_PATTERN = /\r\n|\r|\n/g
const BR_TAG_PATTERN = /<br\s*\/?>/gi
const ALIGNMENT_CELL_PATTERN = /^:?-+:?$/

export function escapeTableCell(cell: string): string {
  return cell.replace(LINE_BREAK_PATTERN, '<br>').replace(/(\\*)(\|)/g, (match, backslashes, pipe) => {
    if (backslashes.length % 2 === 1) {
      return match
    }
    return `${backslashes}\\${pipe}`
  })
}

export function unescapeTableCell(cell: string): string {
  return cell.replace(BR_TAG_PATTERN, '\n').replace(/\\\|/g, '|')
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

/** Split one table line on the pipes that are not escaped. */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim()
  const cells: string[] = []
  let current = ''

  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === '\\' && trimmed[i + 1] === '|') {
      current += '\\|'
      i += 1
      continue
    }
    if (trimmed[i] === '|') {
      cells.push(current)
      current = ''
      continue
    }
    current += trimmed[i]
  }
  cells.push(current)

  // A leading or a trailing pipe adds one empty cell at each end.
  if (cells.length > 1 && trimmed.startsWith('|') && cells[0]!.trim() === '') {
    cells.shift()
  }
  if (cells.length > 1 && trimmed.endsWith('|') && cells[cells.length - 1]!.trim() === '') {
    cells.pop()
  }

  return cells.map(cell => cell.trim())
}

function cellAlignment(cell: string): ColumnAlign | null {
  if (!ALIGNMENT_CELL_PATTERN.test(cell)) {
    return null
  }
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) {
    return 'center'
  }
  return right ? 'right' : 'left'
}

/** Read a separator line. It returns `null` when the line is not a separator. */
function separatorAlignments(line: string): ColumnAlign[] | null {
  const cells = splitTableRow(line)
  const alignments = cells.map(cellAlignment)
  if (cells.length === 0 || alignments.includes(null)) {
    return null
  }
  return alignments as ColumnAlign[]
}

function contentLines(input: string): string[] {
  return input.split(LINE_BREAK_PATTERN).map(line => line.trim()).filter(line => line.length > 0)
}

/** Pad a short row and drop the extra cells of a long row, as GFM does. */
function fitRow(cells: string[], width: number): string[] {
  return Array.from({ length: width }, (_, i) => cells[i] ?? '')
}

export function isMarkdownTable(input: string): boolean {
  const lines = contentLines(input)
  return lines.length >= 2 && lines[0]!.includes('|') && separatorAlignments(lines[1]!) !== null
}

/**
 * Parse a Markdown table into editable headers, alignments, and rows.
 *
 * It accepts a table with or without the leading and trailing pipes. It turns
 * `<br>` back into a line break and `\|` back into a pipe. A row with fewer
 * cells than the header gets empty cells. The extra cells of a longer row are
 * dropped, as GFM does.
 */
export function parseMarkdownTable(input: string): ParsedTable {
  const lines = contentLines(input)

  if (lines.length < 2 || !lines[0]!.includes('|')) {
    throw new DataError('No Markdown table found.\n\nA table needs a header row and a separator row, such as `| A | B |` and `| --- | --- |`.')
  }

  const alignments = separatorAlignments(lines[1]!)
  if (!alignments) {
    throw new DataError('The second line is not a separator row.\n\nUse dashes and colons, such as `| :--- | :---: | ---: |`.')
  }

  const headers = splitTableRow(lines[0]!).map(unescapeTableCell)
  if (headers.length === 0) {
    throw new DataError('The header row has no cells.\n\nWrite the column names between pipes, such as `| A | B |`.')
  }

  return {
    headers,
    alignments: Array.from({ length: headers.length }, (_, i) => alignments[i] ?? 'left'),
    rows: lines.slice(2).map(line => fitRow(splitTableRow(line).map(unescapeTableCell), headers.length)),
  }
}

/**
 * Parse spreadsheet clipboard text into cells.
 *
 * It detects the tab, comma, or semicolon delimiter, and it keeps a quoted
 * field that holds a delimiter or a line break.
 */
export function parseDelimitedCells(input: string): string[][] {
  return parseCsv(input)
}

/** Parse spreadsheet clipboard text into a table. The first row gives the headers. */
export function parseDelimitedTable(input: string): ParsedTable {
  const [headers, ...body] = parseDelimitedCells(input)

  if (!headers || headers.length === 0) {
    throw new DataError('No spreadsheet data found.\n\nPaste rows of comma-separated or tab-separated text.')
  }

  return {
    headers,
    alignments: headers.map(() => 'left' as ColumnAlign),
    rows: body.map(row => fitRow(row, headers.length)),
  }
}

/** Parse a Markdown table, or spreadsheet text when the input is not a table. */
export function parseTableInput(input: string): ParsedTable {
  return isMarkdownTable(input) ? parseMarkdownTable(input) : parseDelimitedTable(input)
}
