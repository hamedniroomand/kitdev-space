export interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: unknown
  pk: number
}

export interface TableInfo {
  name: string
  rowCount: number
  columns: ColumnInfo[]
  hasRowId: boolean
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  durationMs: number
}

export type SqlValue = number | string | Uint8Array | null

export type WorkerMessage
  = | { type: 'INIT_DB', bytes?: Uint8Array }
    | { type: 'EXECUTE_QUERY', sql: string }
    | { type: 'UPDATE_CELL', table: string, rowid: number, column: string, value: SqlValue }
    | { type: 'LOAD_SAMPLE' }
    | { type: 'EXPORT_DB' }

export type WorkerResponse
  = | { type: 'DB_READY', tables: TableInfo[], sizeBytes: number }
    | { type: 'QUERY_RESULT', result: QueryResult }
    | { type: 'UPDATE_SUCCESS', table: string, rowid: number, column: string, value: SqlValue }
    | { type: 'EXPORT_RESULT', bytes: Uint8Array }
    | { type: 'ERROR', message: string }

export function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

export function buildUpdateQuery(table: string, column: string): string {
  if (!isValidIdentifier(table) || !isValidIdentifier(column)) {
    throw new Error('Invalid SQL identifier.')
  }
  return `UPDATE "${table}" SET "${column}" = :val WHERE rowid = :rowid;`
}
