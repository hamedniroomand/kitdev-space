import { parseCsvDetailed } from './csv'
import { DataError } from './errors'

export type ColumnDataType = 'text' | 'number' | 'date' | 'boolean'

export interface ColumnSchema {
  name: string
  type: ColumnDataType
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
