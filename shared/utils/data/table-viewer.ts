import { parseCsv } from './csv'

export interface TableRow {
  [key: string]: string | number | boolean | null | undefined
}

export interface TableData {
  columns: string[]
  rows: TableRow[]
}

export function parseToTable(input: string): TableData {
  const trimmed = input.trim()
  if (!trimmed) {
    return { columns: [], rows: [] }
  }

  // 1. Try JSON parsing
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const list = Array.isArray(parsed)
        ? parsed
        : (Object.values(parsed).find(val => Array.isArray(val)) as unknown[] || [parsed])

      if (Array.isArray(list) && list.length > 0) {
        const columnsSet = new Set<string>()
        for (const item of list) {
          if (item && typeof item === 'object') {
            for (const key of Object.keys(item)) {
              columnsSet.add(key)
            }
          }
        }
        const columns = Array.from(columnsSet)
        const rows: TableRow[] = list.map((item) => {
          const row: TableRow = {}
          for (const col of columns) {
            const hasProp = item && typeof item === 'object' && Object.hasOwn(item, col)
            if (!hasProp) {
              row[col] = undefined
            }
            else {
              const val = (item as Record<string, unknown>)[col]
              if (val === null) {
                row[col] = null
              }
              else if (val === undefined) {
                row[col] = undefined
              }
              else if (typeof val === 'object') {
                row[col] = JSON.stringify(val)
              }
              else {
                row[col] = val as string | number | boolean
              }
            }
          }
          return row
        })
        return { columns, rows }
      }
    }
    catch {
      // Fall through to CSV parsing
    }
  }

  // 2. Parse as CSV
  const csvGrid = parseCsv(trimmed)
  if (csvGrid.length === 0) {
    return { columns: [], rows: [] }
  }

  const columns = csvGrid[0]!.map((col, idx) => col.trim() || `Column_${idx + 1}`)
  const rows: TableRow[] = []

  for (let r = 1; r < csvGrid.length; r++) {
    const rowValues = csvGrid[r]!
    if (rowValues.length === 1 && rowValues[0] === '')
      continue
    const row: TableRow = {}
    for (let c = 0; c < columns.length; c++) {
      const colName = columns[c]!
      row[colName] = rowValues[c] ?? ''
    }
    rows.push(row)
  }

  return { columns, rows }
}

export function filterAndSortRows(
  rows: TableRow[],
  query: string,
  sortCol?: string,
  sortAsc = true,
): TableRow[] {
  let result = [...rows]

  if (query.trim()) {
    const q = query.toLowerCase()
    result = result.filter(row =>
      Object.values(row).some(val => val !== undefined && val !== null && String(val).toLowerCase().includes(q)),
    )
  }

  if (sortCol) {
    result.sort((a, b) => {
      const valA = a[sortCol]
      const valB = b[sortCol]

      if (valA === valB)
        return 0
      if (valA === undefined || valA === null)
        return sortAsc ? 1 : -1
      if (valB === undefined || valB === null)
        return sortAsc ? -1 : 1

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      const cmp = strA.localeCompare(strB, undefined, { numeric: true })
      return sortAsc ? cmp : -cmp
    })
  }

  return result
}
