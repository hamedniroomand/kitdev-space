import { describe, expect, it } from 'vitest'
import { blobPreview, formatByteSize, isBlobValue, isDmlStatement, splitSqlStatements } from '~/utils/sqlite/statements'

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

describe('blob previews', () => {
  it('detects a BLOB value', () => {
    expect(isBlobValue(new Uint8Array([1, 2]))).toBe(true)
  })

  it('does not treat a string as a BLOB', () => {
    expect(isBlobValue('abc')).toBe(false)
    expect(isBlobValue(null)).toBe(false)
    expect(isBlobValue(42)).toBe(false)
  })

  it('shows the byte length and hex of a small BLOB', () => {
    const preview = blobPreview(new Uint8Array([0x00, 0xFF, 0x10]))
    expect(preview.byteLength).toBe(3)
    expect(preview.hex).toBe('00 ff 10')
    expect(preview.truncated).toBe(false)
  })

  it('marks a long BLOB as truncated and previews only the first bytes', () => {
    const preview = blobPreview(new Uint8Array(100).fill(0xAB))
    expect(preview.byteLength).toBe(100)
    expect(preview.truncated).toBe(true)
    expect(preview.hex.split(' ')).toHaveLength(16)
  })

  it('does not build a string from the whole BLOB', () => {
    const preview = blobPreview(new Uint8Array(5_000_000))
    expect(preview.hex.length).toBeLessThan(80)
  })

  it('formats a byte size', () => {
    expect(formatByteSize(512)).toBe('512 B')
    expect(formatByteSize(2048)).toBe('2.0 KB')
    expect(formatByteSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
