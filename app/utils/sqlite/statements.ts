/**
 * Splits a SQL script into single statements. It steps over a string literal,
 * a quoted identifier, and a comment, so a semicolon inside one of those does
 * not end a statement.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let index = 0

  while (index < sql.length) {
    const ch = sql[index]!
    const next = sql[index + 1]

    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', index)
      const stop = end === -1 ? sql.length : end
      current += sql.slice(index, stop)
      index = stop
      continue
    }

    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', index + 2)
      const stop = end === -1 ? sql.length : end + 2
      current += sql.slice(index, stop)
      index = stop
      continue
    }

    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      current += ch
      index++
      while (index < sql.length) {
        const inner = sql[index]!
        current += inner
        index++
        // A doubled quote is an escaped quote, so it stays inside the literal.
        if (inner === quote) {
          if (sql[index] === quote) {
            current += quote
            index++
            continue
          }
          break
        }
      }
      continue
    }

    if (ch === ';') {
      if (current.trim()) {
        statements.push(current.trim())
      }
      current = ''
      index++
      continue
    }

    current += ch
    index++
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

const DML = /^\s*(?:insert|update|delete|replace)\b/i

/** True when a statement changes rows, so a row count is worth showing. */
export function isDmlStatement(sql: string): boolean {
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
  return DML.test(withoutComments)
}
