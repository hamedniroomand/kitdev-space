import { DataError } from './errors'
import { sqlLiteral } from './sql'

export type CsvDelimiter = ',' | ';' | '\t'

export const CSV_DELIMITERS: { label: string, value: CsvDelimiter | 'auto' }[] = [
  { label: 'Auto-detect', value: 'auto' },
  { label: 'Comma (,)', value: ',' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Tab', value: '\t' },
]

const DELIMITER_CANDIDATES: CsvDelimiter[] = [',', ';', '\t']

function countDelimiter(line: string, delimiter: CsvDelimiter): number {
  let count = 0
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && char === delimiter) {
      count += 1
    }
  }

  return count
}

export function detectDelimiter(input: string): CsvDelimiter {
  const lines = input
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .slice(0, 10)

  if (lines.length === 0) {
    return ','
  }

  let best: CsvDelimiter = ','
  let bestScore = -1

  for (const delimiter of DELIMITER_CANDIDATES) {
    const scores = lines.map(line => countDelimiter(line, delimiter))
    const first = scores[0] ?? 0
    if (first === 0) {
      continue
    }

    const consistent = scores.every(score => score === first)
    const score = first * lines.length + (consistent ? 1000 : 0)

    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }

  return best
}

export interface ParseCsvOptions {
  delimiter?: CsvDelimiter | 'auto'
  validateColumns?: boolean
  excludeInvalidRows?: boolean
}

export interface ParseCsvResult {
  rows: string[][]
  excludedCount: number
}

export function parseCsvDetailed(
  input: string,
  optionsOrDelimiter: CsvDelimiter | 'auto' | ParseCsvOptions = 'auto',
): ParseCsvResult {
  const options: ParseCsvOptions = typeof optionsOrDelimiter === 'string'
    ? { delimiter: optionsOrDelimiter }
    : optionsOrDelimiter

  const text = input.replace(/^\uFEFF/, '')
  if (!text.trim()) {
    throw new DataError('Enter CSV text.')
  }

  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      throw new DataError('Input is JSON, not CSV. Switch mode to JSON → CSV.')
    }
    catch (cause) {
      if (cause instanceof DataError) {
        throw cause
      }
      const message = (cause as Error).message || 'Invalid JSON syntax'
      throw new DataError(`Invalid JSON input: ${message}. JSON input cannot be processed as CSV.`, { cause })
    }
  }

  const sep = options.delimiter === undefined || options.delimiter === 'auto'
    ? detectDelimiter(text)
    : options.delimiter

  const rawRows: { rowNumber: number, cells: string[] }[] = []
  let currentRow: string[] = []
  let field = ''
  let inQuotes = false
  let quoteStartRow = 1
  let currentRowNumber = 1
  let rowStartNumber = 1

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"'
          i += 1
        }
        else {
          inQuotes = false
        }
      }
      else {
        field += char
        if (char === '\n') {
          currentRowNumber += 1
        }
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      quoteStartRow = currentRowNumber
      continue
    }

    if (char === sep) {
      currentRow.push(field)
      field = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    if (char === '\n') {
      currentRow.push(field)
      rawRows.push({ rowNumber: rowStartNumber, cells: currentRow })
      currentRow = []
      field = ''
      currentRowNumber += 1
      rowStartNumber = currentRowNumber
      continue
    }

    field += char
  }

  if (inQuotes) {
    throw new DataError(`CSV has an unclosed quote on row ${quoteStartRow}.`, { line: quoteStartRow })
  }

  if (field.length > 0 || currentRow.length > 0) {
    currentRow.push(field)
    rawRows.push({ rowNumber: rowStartNumber, cells: currentRow })
  }

  while (rawRows.length > 0) {
    const last = rawRows[rawRows.length - 1]!
    if (last.cells.length === 1 && last.cells[0] === '') {
      rawRows.pop()
      continue
    }
    break
  }

  if (rawRows.length === 0) {
    throw new DataError('Enter CSV text.')
  }

  const expectedColumns = rawRows[0]!.cells.length
  const validateColumns = options.validateColumns !== false

  if (validateColumns && expectedColumns > 0) {
    const validRows: string[][] = []
    const invalidRows: { rowNumber: number, columns: number, expected: number }[] = []

    for (const r of rawRows) {
      if (r.cells.length !== expectedColumns) {
        invalidRows.push({
          rowNumber: r.rowNumber,
          columns: r.cells.length,
          expected: expectedColumns,
        })
      }
      else {
        validRows.push(r.cells)
      }
    }

    if (invalidRows.length > 0) {
      if (options.excludeInvalidRows) {
        return {
          rows: validRows,
          excludedCount: invalidRows.length,
        }
      }
      const first = invalidRows[0]!
      throw new DataError(
        `Row ${first.rowNumber} has ${first.columns} columns, expected ${first.expected}.`,
        { line: first.rowNumber },
      )
    }

    return {
      rows: validRows,
      excludedCount: 0,
    }
  }

  return {
    rows: rawRows.map(r => r.cells),
    excludedCount: 0,
  }
}

export function parseCsv(
  input: string,
  optionsOrDelimiter: CsvDelimiter | 'auto' | ParseCsvOptions = 'auto',
): string[][] {
  return parseCsvDetailed(input, optionsOrDelimiter).rows
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>()
  return headers.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function coerceCell(value: string): string | number | boolean | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return ''
  }
  if (/^null$/i.test(trimmed)) {
    return null
  }
  if (/^true$/i.test(trimmed)) {
    return true
  }
  if (/^false$/i.test(trimmed)) {
    return false
  }
  if (/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed)) {
    if (/^[+-]?0\d+/.test(trimmed) || trimmed.replace(/\D/g, '').length > 15) {
      return value
    }
    const number = Number(trimmed)
    if (Number.isFinite(number)) {
      return number
    }
  }
  return value
}

export function csvToJson(
  input: string,
  options: {
    delimiter?: CsvDelimiter | 'auto'
    header?: boolean
    coerce?: boolean
    validateColumns?: boolean
    excludeInvalidRows?: boolean
  } = {},
): unknown[] {
  const rows = parseCsv(input, {
    delimiter: options.delimiter ?? 'auto',
    validateColumns: options.validateColumns,
    excludeInvalidRows: options.excludeInvalidRows,
  })
  if (rows.length === 0) {
    return []
  }

  const header = options.header !== false
  const coerce = options.coerce !== false

  if (!header) {
    return rows.map(row => row.map(cell => (coerce ? coerceCell(cell) : cell)))
  }

  const headers = uniqueHeaders(rows[0] ?? [])
  return rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {}
    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i]!
      const raw = row[i] ?? ''
      record[key] = coerce ? coerceCell(raw) : raw
    }
    return record
  })
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

export function escapeCsvField(value: unknown, delimiter: CsvDelimiter = ','): string {
  const text = cellToString(value)
  const needsQuotes = text.includes('"')
    || text.includes('\n')
    || text.includes('\r')
    || text.includes(delimiter)
  const escaped = text.replaceAll('"', '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

export function formatCsvRow(row: unknown[], delimiter: CsvDelimiter = ','): string {
  return row.map(cell => escapeCsvField(cell, delimiter)).join(delimiter)
}

export function formatCsv(columns: string[], rows: unknown[][], delimiter: CsvDelimiter = ','): string {
  const header = formatCsvRow(columns, delimiter)
  const lines = rows.map(row => formatCsvRow(row, delimiter))
  return [header, ...lines].join('\n')
}

export function jsonToCsv(
  input: string | unknown,
  options: { delimiter?: CsvDelimiter } = {},
): string {
  let data: unknown
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    }
    catch (cause) {
      const message = (cause as Error).message || 'Invalid JSON syntax'
      throw new DataError(`Invalid JSON syntax: ${message}`, { cause })
    }
  }
  else {
    data = input
  }
  const delimiter = options.delimiter ?? ','

  if (!Array.isArray(data)) {
    throw new DataError('JSON must be an array of objects or an array of arrays.')
  }

  if (data.length === 0) {
    return ''
  }

  if (Array.isArray(data[0])) {
    return data.map((row) => {
      if (!Array.isArray(row)) {
        throw new DataError('Every row must be an array when the first row is an array.')
      }
      return row.map(cell => escapeCsvField(cellToString(cell), delimiter)).join(delimiter)
    }).join('\n')
  }

  if (data[0] === null || typeof data[0] !== 'object') {
    throw new DataError('JSON must be an array of objects or an array of arrays.')
  }

  const keys: string[] = []
  const seen = new Set<string>()
  for (const item of data) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new DataError('Every item must be an object when converting object rows.')
    }
    for (const key of Object.keys(item as Record<string, unknown>)) {
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
    }
  }

  const lines = [
    keys.map(key => escapeCsvField(key, delimiter)).join(delimiter),
    ...data.map((item) => {
      const record = item as Record<string, unknown>
      return keys.map(key => escapeCsvField(cellToString(record[key]), delimiter)).join(delimiter)
    }),
  ]

  return lines.join('\n')
}

function quoteIdent(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new DataError('Enter a table name.')
  }
  if (!/^[A-Z_]\w*$/i.test(trimmed)) {
    throw new DataError('Use letters, numbers, and underscores for the table name. Start with a letter or underscore.')
  }
  return trimmed
}

function toSqlColumnIdent(name: string, index: number): string {
  let value = name
    .trim()
    .replace(/\W+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  if (!value) {
    value = `column_${index + 1}`
  }
  if (/^\d/.test(value)) {
    value = `col_${value}`
  }
  return value
}

export function csvToSqlInsert(
  input: string,
  tableName: string,
  options: {
    delimiter?: CsvDelimiter | 'auto'
    header?: boolean
    validateColumns?: boolean
    excludeInvalidRows?: boolean
  } = {},
): string {
  const table = quoteIdent(tableName)
  const rows = parseCsv(input, {
    delimiter: options.delimiter ?? 'auto',
    validateColumns: options.validateColumns,
    excludeInvalidRows: options.excludeInvalidRows,
  })
  if (rows.length === 0) {
    throw new DataError('Enter CSV text.')
  }

  const header = options.header !== false
  let columns: string[]
  let dataRows: string[][]

  if (header) {
    columns = uniqueHeaders(rows[0] ?? []).map((name, index) => toSqlColumnIdent(name, index))
    columns = uniqueHeaders(columns)
    dataRows = rows.slice(1)
  }
  else {
    const width = Math.max(...rows.map(row => row.length), 0)
    columns = Array.from({ length: width }, (_, index) => `column_${index + 1}`)
    dataRows = rows
  }

  if (columns.length === 0) {
    throw new DataError('CSV has no columns.')
  }

  if (dataRows.length === 0) {
    throw new DataError('CSV has a header but no data rows.')
  }

  const columnList = columns.join(', ')

  return dataRows.map((row) => {
    const values = columns.map((_, index) => sqlLiteral(coerceCell(row[index] ?? '')))
    return `INSERT INTO ${table} (${columnList}) VALUES (${values.join(', ')});`
  }).join('\n')
}

export function convertCsvJsonSql(input: {
  mode: 'csv-json' | 'json-csv' | 'csv-sql'
  text: string
  delimiter?: CsvDelimiter | 'auto'
  tableName?: string
  header?: boolean
  validateColumns?: boolean
  excludeInvalidRows?: boolean
}): { output: string, delimiter?: CsvDelimiter, excludedRowCount?: number } {
  const delimiter = input.delimiter ?? 'auto'

  if (input.mode === 'csv-json') {
    const detected = delimiter === 'auto' ? detectDelimiter(input.text) : delimiter
    const detailed = parseCsvDetailed(input.text, {
      delimiter,
      validateColumns: input.validateColumns,
      excludeInvalidRows: input.excludeInvalidRows,
    })
    const rows = detailed.rows
    let data: unknown[]
    const header = input.header !== false
    if (!header) {
      data = rows.map(row => row.map(cell => coerceCell(cell)))
    }
    else {
      const headers = uniqueHeaders(rows[0] ?? [])
      data = rows.slice(1).map((row) => {
        const record: Record<string, unknown> = {}
        for (let i = 0; i < headers.length; i += 1) {
          const key = headers[i]!
          const raw = row[i] ?? ''
          record[key] = coerceCell(raw)
        }
        return record
      })
    }

    return {
      output: JSON.stringify(data, null, 2),
      delimiter: detected,
      excludedRowCount: detailed.excludedCount,
    }
  }

  if (input.mode === 'json-csv') {
    const sep = delimiter === 'auto' ? ',' : delimiter
    return {
      output: jsonToCsv(input.text, { delimiter: sep }),
      delimiter: sep,
    }
  }

  const detected = delimiter === 'auto' ? detectDelimiter(input.text) : delimiter
  const detailed = parseCsvDetailed(input.text, {
    delimiter,
    validateColumns: input.validateColumns,
    excludeInvalidRows: input.excludeInvalidRows,
  })
  return {
    output: csvToSqlInsert(input.text, input.tableName ?? 'table_name', {
      delimiter,
      header: input.header,
      validateColumns: input.validateColumns,
      excludeInvalidRows: input.excludeInvalidRows,
    }),
    delimiter: detected,
    excludedRowCount: detailed.excludedCount,
  }
}
