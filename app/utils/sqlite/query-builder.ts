import type { ColumnInfo } from '~/types/sqlite'
import { quoteIdentifier, sqlLiteral } from '#shared/utils/data/sql'

export { quoteIdentifier, sqlLiteral }

export type FilterOperator = 'eq' | 'neq' | 'contains' | 'starts' | 'gt' | 'lt' | 'null' | 'notnull'

export interface TableFilter {
  column: string
  operator: FilterOperator
  value: string
}

export interface TableSort {
  column: string
  direction: 'asc' | 'desc'
}

/** The state of the query bar. `buildTableQuery` turns it into SQL. */
export interface TableQueryState {
  table: string
  /** Matches every text column with LIKE. */
  search: string
  filters: TableFilter[]
  sort: TableSort | null
  limit: number
  offset: number
}

/** The grid hides this column and uses it to edit, duplicate, and delete a row. */
export const ROWID_ALIAS = '_rowid_'

export const PAGE_SIZES = [50, 100, 500, 1000]

export const FILTER_OPERATORS: { value: FilterOperator, label: string, needsValue: boolean }[] = [
  { value: 'eq', label: 'equals', needsValue: true },
  { value: 'neq', label: 'does not equal', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'starts', label: 'starts with', needsValue: true },
  { value: 'gt', label: 'greater than', needsValue: true },
  { value: 'lt', label: 'less than', needsValue: true },
  { value: 'null', label: 'is null', needsValue: false },
  { value: 'notnull', label: 'is not null', needsValue: false },
]

export function buildUpdateQuery(table: string, column: string): string {
  return `UPDATE ${quoteIdentifier(table)} SET ${quoteIdentifier(column)} = :val WHERE rowid = :rowid;`
}

function likeLiteral(value: string, mode: 'contains' | 'starts'): string {
  const escaped = value.replace(/[\\%_]/g, match => `\\${match}`).replace(/'/g, '\'\'')
  return mode === 'contains' ? `'%${escaped}%' ESCAPE '\\'` : `'${escaped}%' ESCAPE '\\'`
}

/** SQLite has type affinity: a column with TEXT, CHAR, or CLOB in its type holds text. An untyped column can hold anything. */
export function isTextColumn(column: ColumnInfo): boolean {
  const type = column.type.toUpperCase()
  return type === '' || /CHAR|CLOB|TEXT/.test(type)
}

export function initialTableQuery(table: string, limit = 100): TableQueryState {
  return { table, search: '', filters: [], sort: null, limit, offset: 0 }
}

export function filterToSql(filter: TableFilter): string {
  const column = quoteIdentifier(filter.column)
  switch (filter.operator) {
    case 'eq':
      return `${column} = ${sqlLiteral(filter.value)}`
    case 'neq':
      return `${column} != ${sqlLiteral(filter.value)}`
    case 'contains':
      return `${column} LIKE ${likeLiteral(filter.value, 'contains')}`
    case 'starts':
      return `${column} LIKE ${likeLiteral(filter.value, 'starts')}`
    case 'gt':
      return `${column} > ${sqlLiteral(filter.value)}`
    case 'lt':
      return `${column} < ${sqlLiteral(filter.value)}`
    case 'null':
      return `${column} IS NULL`
    case 'notnull':
      return `${column} IS NOT NULL`
  }
}

/** A short label for a filter chip, such as `price > 30` or `name contains "lamp"`. */
export function filterLabel(filter: TableFilter): string {
  const symbol: Record<FilterOperator, string> = {
    eq: '=',
    neq: '≠',
    contains: 'contains',
    starts: 'starts with',
    gt: '>',
    lt: '<',
    null: 'is null',
    notnull: 'is not null',
  }
  const needsValue = FILTER_OPERATORS.find(op => op.value === filter.operator)?.needsValue
  return needsValue ? `${filter.column} ${symbol[filter.operator]} ${JSON.stringify(filter.value)}` : `${filter.column} ${symbol[filter.operator]}`
}

export function buildWhere(state: TableQueryState, textColumns: string[]): string | null {
  const parts: string[] = []
  const search = state.search.trim()
  if (search && textColumns.length) {
    const like = likeLiteral(search, 'contains')
    parts.push(`(${textColumns.map(name => `${quoteIdentifier(name)} LIKE ${like}`).join(' OR ')})`)
  }
  for (const filter of state.filters) {
    parts.push(filterToSql(filter))
  }
  return parts.length ? parts.join(' AND ') : null
}

/**
 * Builds the page query and its count query. The page query selects the rowid
 * under an alias, so the grid can edit any row, whatever the first column is.
 */
export function buildTableQuery(
  state: TableQueryState,
  options: { hasRowId: boolean, textColumns: string[] },
): { sql: string, countSql: string } {
  const table = quoteIdentifier(state.table)
  const where = buildWhere(state, options.textColumns)
  const whereClause = where ? `\nWHERE ${where}` : ''
  const select = options.hasRowId ? `SELECT rowid AS ${quoteIdentifier(ROWID_ALIAS)}, *` : 'SELECT *'
  const order = state.sort ? `\nORDER BY ${quoteIdentifier(state.sort.column)} ${state.sort.direction.toUpperCase()}` : ''
  const limit = Math.max(1, Math.floor(state.limit))
  const offset = Math.max(0, Math.floor(state.offset))
  return {
    sql: `${select}\nFROM ${table}${whereClause}${order}\nLIMIT ${limit} OFFSET ${offset};`,
    countSql: `SELECT COUNT(*) FROM ${table}${whereClause};`,
  }
}

/** Ready-made queries for the active table. The first text column drives the grouping. */
export function tableSnippets(table: string, columns: ColumnInfo[]): { label: string, sql: string }[] {
  const quoted = quoteIdentifier(table)
  const text = columns.find(isTextColumn)
  const snippets = [{ label: 'Count the rows', sql: `SELECT COUNT(*) AS row_count\nFROM ${quoted};` }]
  if (text) {
    const column = quoteIdentifier(text.name)
    snippets.push(
      { label: `Distinct values of ${text.name}`, sql: `SELECT DISTINCT ${column}\nFROM ${quoted}\nORDER BY ${column};` },
      { label: `Count by ${text.name}`, sql: `SELECT ${column}, COUNT(*) AS row_count\nFROM ${quoted}\nGROUP BY ${column}\nORDER BY row_count DESC;` },
    )
  }
  return snippets
}
