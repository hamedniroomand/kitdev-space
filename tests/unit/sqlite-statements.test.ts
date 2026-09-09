import { describe, expect, it } from 'vitest'
import { isDmlStatement, splitSqlStatements } from '~/utils/sqlite/statements'

describe('splitSqlStatements', () => {
  it('splits two statements', () => {
    expect(splitSqlStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2'])
  })

  it('keeps a statement with no trailing semicolon', () => {
    expect(splitSqlStatements('SELECT 1')).toEqual(['SELECT 1'])
  })

  it('drops an empty statement', () => {
    expect(splitSqlStatements('SELECT 1;;  ;')).toEqual(['SELECT 1'])
  })

  it('keeps a semicolon inside a string literal', () => {
    expect(splitSqlStatements('INSERT INTO t VALUES (\'a;b\');')).toEqual([
      'INSERT INTO t VALUES (\'a;b\')',
    ])
  })

  it('keeps a doubled quote inside a string literal', () => {
    expect(splitSqlStatements('SELECT \'O\'\'Reilly; x\';')).toEqual(['SELECT \'O\'\'Reilly; x\''])
  })

  it('keeps a semicolon inside a quoted identifier', () => {
    expect(splitSqlStatements('SELECT "we;ird" FROM t;')).toEqual(['SELECT "we;ird" FROM t'])
  })

  it('keeps a semicolon inside a line comment', () => {
    const sql = 'SELECT 1; -- note; still comment\nSELECT 2;'
    expect(splitSqlStatements(sql)).toEqual(['SELECT 1', '-- note; still comment\nSELECT 2'])
  })

  it('keeps a semicolon inside a block comment', () => {
    const sql = 'SELECT 1; /* a; b */ SELECT 2;'
    expect(splitSqlStatements(sql)).toEqual(['SELECT 1', '/* a; b */ SELECT 2'])
  })

  it('returns no statement for blank input', () => {
    expect(splitSqlStatements('   \n  ')).toEqual([])
  })

  it('splits a script of mixed statements', () => {
    const sql = `CREATE TABLE t (a INT);
INSERT INTO t VALUES (1);
SELECT * FROM t;`
    expect(splitSqlStatements(sql)).toHaveLength(3)
  })
})

describe('isDmlStatement', () => {
  it('marks an insert as DML', () => {
    expect(isDmlStatement('INSERT INTO t VALUES (1)')).toBe(true)
  })

  it('marks an update as DML', () => {
    expect(isDmlStatement('  update t set a=1')).toBe(true)
  })

  it('marks a delete as DML', () => {
    expect(isDmlStatement('DELETE FROM t')).toBe(true)
  })

  it('does not mark a select as DML', () => {
    expect(isDmlStatement('SELECT * FROM t')).toBe(false)
  })

  it('does not mark a create as DML', () => {
    expect(isDmlStatement('CREATE TABLE t (a INT)')).toBe(false)
  })

  it('sees through a leading comment', () => {
    expect(isDmlStatement('-- add a row\nINSERT INTO t VALUES (1)')).toBe(true)
  })
})
