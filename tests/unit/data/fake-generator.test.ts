import { describe, expect, it } from 'vitest'
import {
  formatAsCsv,
  formatAsSqlInserts,
  generateFakeRows
} from '../../../shared/utils/data/fake-generator'

describe('generateFakeRows', () => {
  it('generates specified number of rows with seed reproducibility', () => {
    const fields = [
      { name: 'id', type: 'integerId' as const },
      { name: 'name', type: 'fullName' as const },
      { name: 'email', type: 'email' as const }
    ]

    const run1 = generateFakeRows({ count: 3, fields, seed: 42 })
    const run2 = generateFakeRows({ count: 3, fields, seed: 42 })

    expect(run1).toHaveLength(3)
    expect(run1[0]?.id).toBe(1)
    expect(run1).toEqual(run2)
  })

  it('formats rows as SQL insert statements', () => {
    const rows = [
      { id: 1, name: 'O\'Reilly', active: true },
      { id: 2, name: 'Alice', active: false }
    ]
    const sql = formatAsSqlInserts(rows, 'users')
    expect(sql).toContain('INSERT INTO "users"')
    expect(sql).toContain('(1, \'O\'\'Reilly\', TRUE)')
  })

  it('formats rows as CSV', () => {
    const rows = [
      { id: 1, name: 'Alice', role: 'Dev' },
      { id: 2, name: 'Bob', role: 'QA' }
    ]
    const csv = formatAsCsv(rows)
    expect(csv).toContain('id,name,role')
    expect(csv).toContain('1,Alice,Dev')
    expect(csv).toContain('2,Bob,QA')
  })
})
