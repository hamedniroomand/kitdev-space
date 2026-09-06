import { describe, expect, it } from 'vitest'
import { getSampleSqlScript } from '../../app/utils/sqlite/sample-data'

describe('Sample Data Script', () => {
  it('returns valid DDL and DML statements', () => {
    const script = getSampleSqlScript()
    expect(script).toContain('CREATE TABLE')
    expect(script).toContain('INSERT INTO')
    expect(script).toContain('products')
    expect(script).toContain('orders')
  })
})
