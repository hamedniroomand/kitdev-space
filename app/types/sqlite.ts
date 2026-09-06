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
    /** `countSql` runs with the page query and gives the total row count of a filtered table. */
    | { type: 'EXECUTE_QUERY', sql: string, countSql?: string }
    | { type: 'UPDATE_CELL', table: string, rowid: number, column: string, value: SqlValue }
    | { type: 'INSERT_ROW', table: string }
    | { type: 'DUPLICATE_ROW', table: string, rowid: number }
    | { type: 'DELETE_ROW', table: string, rowid: number }
    | { type: 'TABLE_SCHEMA', table: string }
    | { type: 'LOAD_SAMPLE' }
    | { type: 'EXPORT_DB' }

export type WorkerResponse
  = | { type: 'DB_READY', tables: TableInfo[], sizeBytes: number }
    | { type: 'QUERY_RESULT', result: QueryResult, total?: number }
    | { type: 'UPDATE_SUCCESS', table: string, rowid: number, column: string, value: SqlValue }
    /** A row was added, copied, or deleted. `rowCount` is the new count of the table. */
    | { type: 'MUTATION_SUCCESS', table: string, rowCount: number }
    | { type: 'SCHEMA_RESULT', table: string, sql: string }
    | { type: 'EXPORT_RESULT', bytes: Uint8Array }
    | { type: 'ERROR', message: string }

export function isValidIdentifier(name: string): boolean {
  return /^[a-z_]\w*$/i.test(name)
}

export function buildUpdateQuery(table: string, column: string): string {
  if (!isValidIdentifier(table) || !isValidIdentifier(column)) {
    throw new Error('Invalid SQL identifier.')
  }
  return `UPDATE "${table}" SET "${column}" = :val WHERE rowid = :rowid;`
}
