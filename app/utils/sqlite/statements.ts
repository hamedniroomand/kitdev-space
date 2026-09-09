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

export interface BlobPreview {
  byteLength: number
  hex: string
  truncated: boolean
}

const HEX_PREVIEW_BYTES = 16

/** True for a cell that SQLite returned as a BLOB. */
export function isBlobValue(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}

/**
 * Describes a BLOB by its size and the first bytes as hex. A multi-megabyte
 * BLOB never becomes a string, so the grid stays responsive.
 */
export function blobPreview(value: Uint8Array): BlobPreview {
  const slice = value.subarray(0, HEX_PREVIEW_BYTES)
  const hex = Array.from(slice)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ')
  return {
    byteLength: value.byteLength,
    hex,
    truncated: value.byteLength > HEX_PREVIEW_BYTES,
  }
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
