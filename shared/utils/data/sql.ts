import { format } from 'sql-formatter'
import type { Extension } from '@codemirror/state'
import { linter, type Diagnostic } from '@codemirror/lint'
import { sql, PostgreSQL, MySQL, SQLite } from '@codemirror/lang-sql'
import { DataError, positionToLineColumn } from './errors'

export type SqlDialect = 'sql' | 'postgresql' | 'mysql' | 'sqlite' | 'transactsql'
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

function resolveDialectParser(dialect: SqlDialect = 'sql') {
  switch (dialect) {
    case 'postgresql':
      return PostgreSQL
    case 'mysql':
      return MySQL
    case 'sqlite':
      return SQLite
    case 'transactsql':
    case 'sql':
    default:
      return sql().language
  }
}

export function formatSql(sqlText: string, options: FormatSqlOptions = {}): string {
  if (!sqlText || !sqlText.trim()) {
    return ''
  }

  const {
    dialect = 'sql',
    indent = '2',
    keywordCase = 'upper'
  } = options

  const useTabs = indent === 'tab'
  const tabWidth = indent === '4' ? 4 : 2

  try {
    return format(sqlText, {
      language: dialect,
      tabWidth,
      useTabs,
      keywordCase
    })
  } catch (cause: unknown) {
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
      cause
    })
  }
}

export function validateSql(sqlText: string, dialect: SqlDialect = 'sql'): SqlValidationResult {
  if (!sqlText || !sqlText.trim()) {
    return { valid: true }
  }

  // 1. Check syntax tree error nodes via Lezer SQL parser
  const parser = resolveDialectParser(dialect).parser
  const tree = parser.parse(sqlText)
  let syntaxError: { from: number, to: number } | null = null

  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        syntaxError = { from: node.from, to: node.to }
        return false
      }
    }
  })

  if (syntaxError) {
    const { line, column } = positionToLineColumn(sqlText, syntaxError.from)
    return {
      valid: false,
      error: `Syntax error near line ${line}, column ${column}`,
      line,
      column
    }
  }

  // 2. Validate against sql-formatter grammar
  try {
    formatSql(sqlText, { dialect })
    return { valid: true }
  } catch (cause: unknown) {
    if (cause instanceof DataError) {
      return {
        valid: false,
        error: cause.message,
        line: cause.line,
        column: cause.column
      }
    }
    const message = (cause as Error)?.message?.split('\n')[0] || 'Invalid SQL syntax'
    return {
      valid: false,
      error: message
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
    const parser = resolveDialectParser(dialect).parser
    const tree = parser.parse(text)

    tree.iterate({
      enter(node) {
        if (node.type.isError) {
          diagnostics.push({
            from: node.from,
            to: Math.max(node.to, node.from + 1),
            severity: 'error',
            message: 'Syntax error'
          })
        }
      }
    })

    return diagnostics
  })
}
