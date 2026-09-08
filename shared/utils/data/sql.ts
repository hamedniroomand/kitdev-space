import type { Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import type { Parser, SyntaxNodeRef } from '@lezer/common'
import type { SqlLanguage } from 'sql-formatter'
import { MSSQL, MySQL, PostgreSQL, sql, SQLite } from '@codemirror/lang-sql'
import { linter } from '@codemirror/lint'
import { format, supportedDialects } from 'sql-formatter'
import { DataError, positionToLineColumn } from './errors'

export type SqlDialect = SqlLanguage
export { supportedDialects }

export const SQL_DIALECT_OPTIONS: Array<{ label: string, value: SqlDialect }> = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'Transact-SQL', value: 'transactsql' },
  { label: 'Amazon Redshift', value: 'redshift' },
  { label: 'Apache Hive', value: 'hive' },
  { label: 'BigQuery', value: 'bigquery' },
  { label: 'ClickHouse', value: 'clickhouse' },
  { label: 'Couchbase N1QL', value: 'n1ql' },
  { label: 'DuckDB', value: 'duckdb' },
  { label: 'IBM DB2', value: 'db2' },
  { label: 'IBM DB2 for i', value: 'db2i' },
  { label: 'MariaDB', value: 'mariadb' },
  { label: 'Oracle PL/SQL', value: 'plsql' },
  { label: 'SingleStoreDB', value: 'singlestoredb' },
  { label: 'Snowflake', value: 'snowflake' },
  { label: 'Spark SQL', value: 'spark' },
  { label: 'T-SQL', value: 'tsql' },
  { label: 'TiDB', value: 'tidb' },
  { label: 'Trino', value: 'trino' },
]

export type SqlIndent = '2' | '4' | 'tab'
export type SqlKeywordCase = 'upper' | 'lower' | 'preserve'

export interface FormatSqlOptions {
  dialect?: SqlDialect
  indent?: SqlIndent
  keywordCase?: SqlKeywordCase
}

export interface SqlValidationResult {
  valid: boolean
  error?: string
  line?: number
  column?: number
}

function resolveDialectParser(dialect: SqlDialect = 'sql'): Parser {
  switch (dialect) {
    case 'postgresql':
    case 'redshift':
      return PostgreSQL.language.parser
    case 'mysql':
    case 'mariadb':
    case 'singlestoredb':
    case 'tidb':
      return MySQL.language.parser
    case 'sqlite':
      return SQLite.language.parser
    case 'transactsql':
    case 'tsql':
      return MSSQL.language.parser
    case 'sql':
    default:
      return sql().language.parser
  }
}

export function formatSql(sqlText: string, options: FormatSqlOptions = {}): string {
  if (!sqlText || !sqlText.trim()) {
    return ''
  }

  const {
    dialect = 'sql',
    indent = '2',
    keywordCase = 'upper',
  } = options

  const useTabs = indent === 'tab'
  const tabWidth = indent === '4' ? 4 : 2

  try {
    return format(sqlText, {
      language: dialect,
      tabWidth,
      useTabs,
      keywordCase,
    })
  }
  catch (cause: unknown) {
    const err = cause as { message?: string, token?: { start?: number } }
    const firstLine = err?.message?.split('\n')[0] || 'SQL formatting failed'
    const position = err?.token?.start
    const { line, column } = position !== undefined
      ? positionToLineColumn(sqlText, position)
      : { line: undefined, column: undefined }

    throw new DataError(firstLine, {
      line,
      column,
      position,
      cause,
    })
  }
}

export function validateSql(sqlText: string, dialect: SqlDialect = 'sql'): SqlValidationResult {
  if (!sqlText || !sqlText.trim()) {
    return { valid: true }
  }

  // 1. Check syntax tree error nodes via Lezer SQL parser
  const parser = resolveDialectParser(dialect)
  const tree = parser.parse(sqlText)
  let syntaxError: { from: number, to: number } | null = null

  tree.iterate({
    enter(node: SyntaxNodeRef) {
      if (node.type.isError) {
        syntaxError = { from: node.from, to: node.to }
        return false
      }
    },
  })

  if (syntaxError !== null) {
    const errorLocation: { from: number, to: number } = syntaxError
    const { line, column } = positionToLineColumn(sqlText, errorLocation.from)
    return {
      valid: false,
      error: `Syntax error near line ${line}, column ${column}`,
      line,
      column,
    }
  }

  // 2. Validate against sql-formatter grammar
  try {
    formatSql(sqlText, { dialect })
    return { valid: true }
  }
  catch (cause: unknown) {
    if (cause instanceof DataError) {
      return {
        valid: false,
        error: cause.message,
        line: cause.line,
        column: cause.column,
      }
    }
    const message = (cause as Error)?.message?.split('\n')[0] || 'Invalid SQL syntax'
    return {
      valid: false,
      error: message,
    }
  }
}

export function createSqlLinter(getDialect: () => SqlDialect): Extension {
  return linter((view) => {
    const text = view.state.doc.toString()
    if (!text || !text.trim()) {
      return []
    }

    const diagnostics: Diagnostic[] = []
    const dialect = getDialect()
    const parser = resolveDialectParser(dialect)
    const tree = parser.parse(text)

    tree.iterate({
      enter(node: SyntaxNodeRef) {
        if (node.type.isError) {
          diagnostics.push({
            from: node.from,
            to: Math.max(node.to, node.from + 1),
            severity: 'error',
            message: 'Syntax error',
          })
        }
      },
    })

    return diagnostics
  })
}

export function quoteIdentifier(name: string, dialect: string = 'sql'): string {
  if (dialect === 'mysql' || dialect === 'mariadb' || dialect === 'singlestoredb' || dialect === 'tidb') {
    return `\`${name.replace(/`/g, '``')}\``
  }
  if (dialect === 'transactsql' || dialect === 'tsql' || dialect === 'mssql') {
    return `[${name.replace(/\]/g, ']]')}]`
  }
  return `"${name.replace(/"/g, '""')}"`
}

export function sqlLiteral(value: unknown, options: { quoteNumericStrings?: boolean } = {}): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!options.quoteNumericStrings && trimmed !== '' && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return trimmed
    }
    return `'${value.replace(/'/g, '\'\'')}'`
  }
  return `'${JSON.stringify(value).replace(/'/g, '\'\'')}'`
}
