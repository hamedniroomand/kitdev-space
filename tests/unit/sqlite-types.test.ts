import { describe, expect, it } from 'vitest'
import { buildUpdateQuery, isValidIdentifier } from '~/types/sqlite'

describe('sQLite Utilities', () => {
  it('validates SQL identifiers safely', () => {
    expect(isValidIdentifier('users')).toBe(true)
    expect(isValidIdentifier('order_items')).toBe(true)
    expect(isValidIdentifier('users; DROP TABLE users;')).toBe(false)
    expect(isValidIdentifier('"injected"')).toBe(false)
  })

  it('builds a safe parameterized UPDATE query', () => {
    const query = buildUpdateQuery('users', 'email')
    expect(query).toBe('UPDATE "users" SET "email" = :val WHERE rowid = :rowid;')
  })

  it('supports tables and columns with spaces and dashes', () => {
    const query = buildUpdateQuery('user orders', 'first-name')
    expect(query).toBe('UPDATE "user orders" SET "first-name" = :val WHERE rowid = :rowid;')
  })
})
