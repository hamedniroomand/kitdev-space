export function rowsToCsv(columns: string[], rows: unknown[][]): string {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) {
      return ''
    }
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = columns.map(escapeCell).join(',')
  const lines = rows.map(row => row.map(escapeCell).join(','))
  return [header, ...lines].join('\n')
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
