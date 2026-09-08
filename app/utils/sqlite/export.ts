import { formatCsv } from '#shared/utils/data/csv'

export function rowsToCsv(columns: string[], rows: unknown[][]): string {
  return formatCsv(columns, rows)
}

export function rowsToJson(columns: string[], rows: unknown[][]): string {
  const objects = rows.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, index) => {
      obj[col] = row[index]
    })
    return obj
  })
  return JSON.stringify(objects, null, 2)
}
