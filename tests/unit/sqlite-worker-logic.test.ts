import { describe, expect, it } from 'vitest'
import { getSampleSqlScript } from '~/utils/sqlite/sample-data'

describe('sample Data Script', () => {
  it('returns valid DDL and DML statements', () => {
    const script = getSampleSqlScript()
    expect(script).toContain('CREATE TABLE')
    expect(script).toContain('INSERT INTO')
    expect(script).toContain('products')
    expect(script).toContain('orders')
  })
})
