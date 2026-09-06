import { describe, expect, it } from 'vitest'
import { formatSql, validateSql } from '#shared/utils/data/sql'

describe('formatSql', () => {
  it('formats simple SELECT query with default options', () => {
    const raw = 'select id, name, email from users where active = 1 order by id desc'
    const formatted = formatSql(raw)
    expect(formatted).toContain('SELECT')
    expect(formatted).toContain('FROM')
    expect(formatted).toContain('WHERE')
    expect(formatted).toContain('ORDER BY')
    expect(formatted).toContain('\n  id,')
  })

  it('respects 4 spaces indentation', () => {
    const raw = 'select id, name from users'
    const formatted = formatSql(raw, { indent: '4' })
    expect(formatted).toContain('\n    id,')
  })

  it('respects tab indentation', () => {
    const raw = 'select id, name from users'
    const formatted = formatSql(raw, { indent: 'tab' })
    expect(formatted).toContain('\n\tid,')
  })

  it('supports lowercase keywords', () => {
    const raw = 'SELECT ID FROM USERS WHERE ACTIVE = 1'
    const formatted = formatSql(raw, { keywordCase: 'lower' })
    expect(formatted).toContain('select')
    expect(formatted).toContain('from')
    expect(formatted).toContain('where')
  })

  it('supports preserve keyword casing', () => {
    const raw = 'Select id From users Where active = 1'
    const formatted = formatSql(raw, { keywordCase: 'preserve' })
    expect(formatted).toContain('Select')
    expect(formatted).toContain('From')
  })

  it('formats postgresql type casts', () => {
    const raw = 'select id::text, created_at::date from logs'
    const formatted = formatSql(raw, { dialect: 'postgresql' })
    expect(formatted).toContain('::text')
  })

  it('formats mysql backticks', () => {
    const raw = 'select `id`, `name` from `users`'
    const formatted = formatSql(raw, { dialect: 'mysql' })
    expect(formatted).toContain('`id`')
  })

  it('formats sqlite queries', () => {
    const raw = 'insert or replace into kv (key, val) values ("a", "b")'
    const formatted = formatSql(raw, { dialect: 'sqlite' })
    expect(formatted).toContain('INSERT OR REPLACE INTO')
  })

  it('formats transactsql queries', () => {
    const raw = 'select top 10 [id], [name] from [users]'
    const formatted = formatSql(raw, { dialect: 'transactsql' })
    expect(formatted).toContain('TOP 10 [id]')
    expect(formatted).toContain('FROM')
  })

  it('returns empty string for empty input', () => {
    expect(formatSql('')).toBe('')
    expect(formatSql('   ')).toBe('')
  })
})

describe('validateSql', () => {
  it('validates correct SQL as valid', () => {
    const result = validateSql('SELECT id, name FROM users WHERE id = 1;')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('detects syntax error for unclosed parenthesis', () => {
    const result = validateSql('SELECT id FROM users WHERE id IN (1, 2')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.line).toBeDefined()
  })

  it('detects syntax error for unexpected token', () => {
    const result = validateSql('SELECT id FROM users WHERE )')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('treats empty input as valid', () => {
    const result = validateSql('   ')
    expect(result.valid).toBe(true)
  })
})
