import type { CsvDelimiter, CsvNullOptions } from './csv'
import { formatMarkdownTable } from '../dev/markdown-table'
import { coerceCell, formatCsv, parseCsvDetailed } from './csv'
import { DataError } from './errors'
import { quoteIdentifier, sqlLiteral } from './sql'

export type ColumnDataType = 'text' | 'number' | 'date' | 'boolean'

export interface ColumnSchema {
  name: string
  type: ColumnDataType
}

export interface ColumnSortState {
  columnIndex: number
  direction: 'asc' | 'desc'
}

export function filterRows(
  rows: string[][],
  columnFilters: Record<number, string>,
): string[][] {
  const activeFilters = Object.entries(columnFilters)
    .map(([idx, text]) => ({ index: Number(idx), text: text.trim().toLowerCase() }))
    .filter(f => f.text.length > 0)

  if (activeFilters.length === 0) {
    return rows
  }

  return rows.filter((row) => {
    return activeFilters.every((filter) => {
      const cell = (row[filter.index] ?? '').toLowerCase()
      return cell.includes(filter.text)
    })
  })
}

export function sortRows(
  rows: string[][],
  sort: ColumnSortState | null,
  columnType: ColumnDataType = 'text',
): string[][] {
  if (!sort) {
    return rows
  }

  const { columnIndex, direction } = sort
  const factor = direction === 'desc' ? -1 : 1

  return [...rows].sort((a, b) => {
    const valA = a[columnIndex] ?? ''
    const valB = b[columnIndex] ?? ''

    if (columnType === 'number') {
      const numA = Number(valA)
      const numB = Number(valB)
      const validA = Number.isFinite(numA)
      const validB = Number.isFinite(numB)
      if (validA && validB) {
        return (numA - numB) * factor
      }
      if (validA)
        return -1 * factor
      if (validB)
        return 1 * factor
    }
    else if (columnType === 'date') {
      const timeA = Date.parse(valA)
      const timeB = Date.parse(valB)
      const validA = !Number.isNaN(timeA)
      const validB = !Number.isNaN(timeB)
      if (validA && validB) {
        return (timeA - timeB) * factor
      }
      if (validA)
        return -1 * factor
      if (validB)
        return 1 * factor
    }
    else if (columnType === 'boolean') {
      const boolA = valA.trim().toLowerCase() === 'true'
      const boolB = valB.trim().toLowerCase() === 'true'
      if (boolA !== boolB) {
        return (boolA ? 1 : -1) * factor
      }
    }

    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * factor
  })
}

export interface CsvPreviewData {
  columns: ColumnSchema[]
  rows: string[][]
  totalRows: number
}

export const COLUMN_TYPE_OPTIONS: Array<{ label: string, value: ColumnDataType }> = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Date', value: 'date' },
  { label: 'Boolean', value: 'boolean' },
]

export function isLeadingZeroIdentifier(value: string): boolean {
  const trimmed = value.trim()
  return /^[+-]?0\d+/.test(trimmed)
}

export function isBooleanValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  return trimmed === 'true' || trimmed === 'false'
}

export function isDateValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 8 || trimmed.length > 35) {
    return false
  }
  // Check ISO 8601 or standard date format like YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(trimmed)) {
    const timestamp = Date.parse(trimmed)
    return !Number.isNaN(timestamp)
  }
  return false
}

export function isNumberValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '' || isLeadingZeroIdentifier(trimmed)) {
    return false
  }
  if (/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed)) {
    const num = Number(trimmed)
    return Number.isFinite(num)
  }
  return false
}

export function inferColumnType(values: string[]): ColumnDataType {
  const nonEmpty = values.map(v => v.trim()).filter(v => v.length > 0)
  if (nonEmpty.length === 0) {
    return 'text'
  }

  // Identifiers with leading zeros default to Text to avoid truncating numbers
  if (nonEmpty.some(isLeadingZeroIdentifier)) {
    return 'text'
  }

  if (nonEmpty.every(isBooleanValue)) {
    return 'boolean'
  }

  if (nonEmpty.every(isDateValue)) {
    return 'date'
  }

  if (nonEmpty.every(isNumberValue)) {
    return 'number'
  }

  return 'text'
}

export function extractPreviewData(
  input: string,
  mode: 'csv' | 'json' = 'csv',
  maxRows = 50,
): CsvPreviewData {
  const text = input.trim()
  if (!text) {
    return { columns: [], rows: [], totalRows: 0 }
  }

  if (mode === 'json') {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    }
    catch (cause) {
      throw new DataError('Invalid JSON input.', { cause })
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { columns: [], rows: [], totalRows: 0 }
    }

    const first = parsed[0]
    if (Array.isArray(first)) {
      const colCount = Math.max(...parsed.map(row => (Array.isArray(row) ? row.length : 0)), 0)
      const columnNames = Array.from({ length: colCount }, (_, idx) => `column_${idx + 1}`)
      const allRows: string[][] = parsed.map(row => (Array.isArray(row) ? row.map(c => String(c ?? '')) : []))
      const previewRows = allRows.slice(0, maxRows)
      const columns: ColumnSchema[] = columnNames.map((name, colIdx) => ({
        name,
        type: inferColumnType(previewRows.map(row => row[colIdx] ?? '')),
      }))

      return {
        columns,
        rows: previewRows,
        totalRows: allRows.length,
      }
    }

    if (typeof first === 'object' && first !== null) {
      const keysSet = new Set<string>()
      for (const item of parsed) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          for (const key of Object.keys(item)) {
            keysSet.add(key)
          }
        }
      }
      const columnNames = Array.from(keysSet)
      const allRows: string[][] = parsed.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return columnNames.map(() => '')
        }
        const rec = item as Record<string, unknown>
        return columnNames.map((key) => {
          const val = rec[key]
          return val === null || val === undefined ? '' : String(val)
        })
      })

      const previewRows = allRows.slice(0, maxRows)
      const columns: ColumnSchema[] = columnNames.map((name, colIdx) => ({
        name,
        type: inferColumnType(previewRows.map(row => row[colIdx] ?? '')),
      }))

      return {
        columns,
        rows: previewRows,
        totalRows: allRows.length,
      }
    }

    return { columns: [], rows: [], totalRows: 0 }
  }

  // CSV mode
  const detailed = parseCsvDetailed(text, { validateColumns: false })
  const allRows = detailed.rows
  if (allRows.length === 0) {
    return { columns: [], rows: [], totalRows: 0 }
  }

  const headerRow = allRows[0]!
  const dataRows = allRows.slice(1)
  const previewRows = dataRows.slice(0, maxRows)

  const columns: ColumnSchema[] = headerRow.map((colName, colIdx) => {
    const name = colName.trim() || `column_${colIdx + 1}`
    const columnValues = previewRows.map(row => row[colIdx] ?? '')
    return {
      name,
      type: inferColumnType(columnValues),
    }
  })

  return {
    columns,
    rows: previewRows,
    totalRows: dataRows.length,
  }
}

export type CsvExportFormat = 'json' | 'csv' | 'tsv' | 'markdown' | 'sql'

export function generateCreateTableSql(
  tableName: string,
  columns: ColumnSchema[],
  dialect: string = 'sql',
): string {
  const table = quoteIdentifier(tableName.trim() || 'table_name', dialect)
  const colDefs = columns.map((col) => {
    const colName = quoteIdentifier(col.name, dialect)
    let colType = 'VARCHAR(255)'
    if (col.type === 'number') {
      colType = dialect === 'sqlite' ? 'NUMERIC' : (dialect === 'postgresql' ? 'NUMERIC' : 'DOUBLE')
    }
    else if (col.type === 'date') {
      colType = dialect === 'sqlite' ? 'TEXT' : (dialect === 'postgresql' ? 'TIMESTAMP' : 'DATETIME')
    }
    else if (col.type === 'boolean') {
      colType = dialect === 'sqlite' ? 'INTEGER' : (dialect === 'postgresql' ? 'BOOLEAN' : 'TINYINT(1)')
    }
    else {
      colType = dialect === 'sqlite' ? 'TEXT' : (dialect === 'postgresql' ? 'TEXT' : 'VARCHAR(255)')
    }
    return `  ${colName} ${colType}`
  })
  return `CREATE TABLE ${table} (\n${colDefs.join(',\n')}\n);`
}

export function getDownloadFilename(
  formatOrMode: CsvExportFormat | 'csv-json' | 'json-csv' | 'csv-sql',
  isFiltered: boolean,
): string {
  const suffix = isFiltered ? '-filtered' : '-all'
  if (formatOrMode === 'json' || formatOrMode === 'csv-json') {
    return `converted${suffix}.json`
  }
  if (formatOrMode === 'tsv') {
    return `converted${suffix}.tsv`
  }
  if (formatOrMode === 'markdown') {
    return `converted${suffix}.md`
  }
  if (formatOrMode === 'sql' || formatOrMode === 'csv-sql') {
    return `inserts${suffix}.sql`
  }
  return `converted${suffix}.csv`
}

export interface ExportFilteredDatasetOptions {
  rows: string[][]
  columns: ColumnSchema[]
  visibleColumnIndices?: number[]
  columnFilters?: Record<number, string>
  format?: CsvExportFormat
  mode?: 'csv-json' | 'json-csv' | 'csv-sql'
  delimiter?: CsvDelimiter
  tableName?: string
  nullOptions?: CsvNullOptions
  includeCreateTable?: boolean
  sqlDialect?: string
}

export function exportFilteredDataset(options: ExportFilteredDatasetOptions): string {
  const visibleIndices = options.visibleColumnIndices ?? options.columns.map((_, i) => i)
  const filtered = options.columnFilters
    ? filterRows(options.rows, options.columnFilters)
    : options.rows

  const selectedColumnSchemas = visibleIndices.map(i => options.columns[i] ?? { name: `column_${i + 1}`, type: 'text' as const })
  const selectedColumns = selectedColumnSchemas.map(c => c.name)
  const selectedRows = filtered.map(row => visibleIndices.map(i => row[i] ?? ''))

  const effectiveFormat: CsvExportFormat = options.format
    ?? (options.mode === 'csv-json' ? 'json' : options.mode === 'csv-sql' ? 'sql' : 'csv')

  if (effectiveFormat === 'json') {
    const records = selectedRows.map((row) => {
      const rec: Record<string, unknown> = {}
      for (let i = 0; i < selectedColumns.length; i += 1) {
        rec[selectedColumns[i]!] = coerceCell(row[i] ?? '', options.nullOptions)
      }
      return rec
    })
    return JSON.stringify(records, null, 2)
  }

  if (effectiveFormat === 'tsv') {
    return formatCsv(
      selectedColumns,
      selectedRows,
      '\t',
      options.nullOptions ?? {},
    )
  }

  if (effectiveFormat === 'markdown') {
    return formatMarkdownTable({
      headers: selectedColumns,
      rows: selectedRows,
      pretty: true,
    })
  }

  if (effectiveFormat === 'sql') {
    const dialect = options.sqlDialect ?? 'sql'
    const table = options.tableName?.trim() || 'table_name'
    const quotedTable = quoteIdentifier(table, dialect)
    const colList = selectedColumns.map(c => quoteIdentifier(c, dialect)).join(', ')

    const insertStatements = selectedRows.map((row) => {
      const values = row.map(cell => sqlLiteral(coerceCell(cell, options.nullOptions)))
      return `INSERT INTO ${quotedTable} (${colList}) VALUES (${values.join(', ')});`
    }).join('\n')

    if (options.includeCreateTable) {
      const createTable = generateCreateTableSql(table, selectedColumnSchemas, dialect)
      return `${createTable}\n\n${insertStatements}`
    }

    return insertStatements
  }

  return formatCsv(
    selectedColumns,
    selectedRows,
    options.delimiter ?? ',',
    options.nullOptions ?? {},
  )
}

export function processHeavyCsvWorker(payload: {
  text: string
  filterText?: string
  filterColIndex?: number
  delimiter?: string
}): { totalRows: number, filteredRowsCount: number } {
  const lines = payload.text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const sep = payload.delimiter ?? ','
  let matchCount = 0
  const filter = payload.filterText?.toLowerCase().trim()
  for (let i = 0; i < lines.length; i++) {
    if (!filter) {
      matchCount++
      continue
    }
    const cols = lines[i]!.split(sep)
    const val = (payload.filterColIndex !== undefined ? cols[payload.filterColIndex] : lines[i]) ?? ''
    if (val.toLowerCase().includes(filter)) {
      matchCount++
    }
  }
  return {
    totalRows: lines.length,
    filteredRowsCount: matchCount,
  }
}
