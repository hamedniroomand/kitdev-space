import { describe, expect, it } from 'vitest'
import {
  buildRecipe,
  formatAsCsv,
  formatAsSqlInserts,
  generateCreateTable,
  generateFakeRows,
  mapValuesToRows,
  parseRecipe,
  validateFields,
} from '#shared/utils/data/fake-generator'

describe('generateFakeRows', () => {
  it('generates specified number of rows with seed reproducibility', () => {
    const fields = [
      { name: 'id', type: 'integerId' as const },
      { name: 'name', type: 'fullName' as const },
      { name: 'email', type: 'email' as const },
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
      { id: 2, name: 'Alice', active: false },
    ]
    const sql = formatAsSqlInserts(rows, 'users')
    expect(sql).toContain('INSERT INTO "users"')
    expect(sql).toContain('(1, \'O\'\'Reilly\', TRUE)')
  })

  it('formats rows as CSV', () => {
    const rows = [
      { id: 1, name: 'Alice', role: 'Dev' },
      { id: 2, name: 'Bob', role: 'QA' },
    ]
    const csv = formatAsCsv(rows)
    expect(csv).toContain('id,name,role')
    expect(csv).toContain('1,Alice,Dev')
    expect(csv).toContain('2,Bob,QA')
  })

  it('keeps generated values intact when renaming fields via mapValuesToRows', () => {
    const values = [
      [1, true],
      [2, false],
    ]
    const before = mapValuesToRows(values, ['old_id', 'old_active'])
    const after = mapValuesToRows(values, ['new_id', 'new_active'])

    expect(before[0]?.old_id).toBe(1)
    expect(after[0]?.new_id).toBe(1)
    expect(after[1]?.new_active).toBe(false)
  })
})

describe('deterministic generation', () => {
  const fields = [
    { name: 'id', type: 'integerId' as const },
    { name: 'name', type: 'fullName' as const },
    { name: 'created_at', type: 'date' as const },
  ]

  it('gives identical rows for the same seed and reference date', () => {
    const opts = { count: 5, fields, seed: 7, refDate: '2024-03-01T00:00:00.000Z' }
    expect(generateFakeRows(opts)).toEqual(generateFakeRows(opts))
  })

  it('gives different rows for a different seed', () => {
    const base = { count: 5, fields, refDate: '2024-03-01T00:00:00.000Z' }
    const a = generateFakeRows({ ...base, seed: 1 })
    const b = generateFakeRows({ ...base, seed: 2 })
    expect(a).not.toEqual(b)
  })

  it('changes a relative date when the reference date changes', () => {
    const base = { count: 3, fields, seed: 7 }
    const a = generateFakeRows({ ...base, refDate: '2020-01-01T00:00:00.000Z' })
    const b = generateFakeRows({ ...base, refDate: '2024-01-01T00:00:00.000Z' })
    expect(a[0]?.created_at).not.toBe(b[0]?.created_at)
  })
})

describe('field configuration rules', () => {
  it('keeps an integer inside the given bounds', () => {
    const rows = generateFakeRows({
      count: 50,
      seed: 3,
      fields: [{ name: 'n', type: 'integer', min: 5, max: 9 }],
    })
    for (const row of rows) {
      expect(row.n as number).toBeGreaterThanOrEqual(5)
      expect(row.n as number).toBeLessThanOrEqual(9)
      expect(Number.isInteger(row.n)).toBe(true)
    }
  })

  it('keeps a float inside the given bounds', () => {
    const rows = generateFakeRows({
      count: 30,
      seed: 3,
      fields: [{ name: 'f', type: 'float', min: 1, max: 2 }],
    })
    for (const row of rows) {
      expect(row.f as number).toBeGreaterThanOrEqual(1)
      expect(row.f as number).toBeLessThanOrEqual(2)
    }
  })

  it('picks only from the given enum values', () => {
    const rows = generateFakeRows({
      count: 30,
      seed: 3,
      fields: [{ name: 'role', type: 'enum', enumValues: ['admin', 'editor'] }],
    })
    for (const row of rows) {
      expect(['admin', 'editor']).toContain(row.role)
    }
  })

  it('keeps a date inside the given interval', () => {
    const rows = generateFakeRows({
      count: 20,
      seed: 3,
      fields: [{ name: 'd', type: 'date', dateFrom: '2020-01-01', dateTo: '2020-12-31' }],
    })
    for (const row of rows) {
      const time = new Date(row.d as string).getTime()
      expect(time).toBeGreaterThanOrEqual(new Date('2020-01-01').getTime())
      expect(time).toBeLessThanOrEqual(new Date('2021-01-01').getTime())
    }
  })

  it('produces nulls at a full null rate', () => {
    const rows = generateFakeRows({
      count: 20,
      seed: 3,
      fields: [{ name: 'maybe', type: 'fullName', nullRate: 100 }],
    })
    expect(rows.every(r => r.maybe === null)).toBe(true)
  })

  it('produces no null at a zero null rate', () => {
    const rows = generateFakeRows({
      count: 20,
      seed: 3,
      fields: [{ name: 'always', type: 'fullName', nullRate: 0 }],
    })
    expect(rows.some(r => r.always === null)).toBe(false)
  })

  it('gives unique values when the field is unique', () => {
    const rows = generateFakeRows({
      count: 40,
      seed: 5,
      fields: [{ name: 'code', type: 'integer', min: 1, max: 5000, unique: true }],
    })
    const values = rows.map(r => r.code)
    expect(new Set(values).size).toBe(values.length)
  })

  it('reports an error when unique values run out', () => {
    expect(() => generateFakeRows({
      count: 50,
      seed: 5,
      fields: [{ name: 'tiny', type: 'integer', min: 1, max: 3, unique: true }],
    })).toThrow(/unique values/)
  })
})

describe('validateFields', () => {
  it('rejects a blank field name', () => {
    expect(validateFields([{ name: '  ', type: 'uuid' }])).toContain('blank')
  })

  it('rejects a duplicate field name', () => {
    expect(validateFields([
      { name: 'id', type: 'uuid' },
      { name: 'id', type: 'uuid' },
    ])).toContain('Duplicate')
  })

  it('rejects an empty field list', () => {
    expect(validateFields([])).toContain('at least one field')
  })

  it('accepts a valid field list', () => {
    expect(validateFields([{ name: 'id', type: 'uuid' }])).toBeNull()
  })
})

describe('sql output with dialects', () => {
  const rows = [
    { id: 1, name: 'Alice', score: 1.5, active: true },
  ]

  it('quotes identifiers for mysql with backticks', () => {
    const sql = formatAsSqlInserts(rows, 'users', 'mysql')
    expect(sql).toContain('INSERT INTO `users`')
    expect(sql).toContain('`name`')
  })

  it('quotes identifiers for postgresql with double quotes', () => {
    const sql = formatAsSqlInserts(rows, 'users', 'postgresql')
    expect(sql).toContain('INSERT INTO "users"')
  })

  it('adds a CREATE TABLE statement when asked', () => {
    const sql = formatAsSqlInserts(rows, 'users', 'sql', true)
    expect(sql).toContain('CREATE TABLE "users"')
    expect(sql).toContain('INSERT INTO "users"')
  })

  it('maps a column type from the generated values', () => {
    const ddl = generateCreateTable(rows, 'users', 'sql')
    expect(ddl).toContain('"id" INTEGER')
    expect(ddl).toContain('"name" TEXT')
    expect(ddl).toContain('"score" DECIMAL(12,2)')
    expect(ddl).toContain('"active" BOOLEAN')
  })
})

describe('recipes', () => {
  const options = {
    count: 12,
    seed: 9,
    refDate: '2024-05-05T00:00:00.000Z',
    tableName: 'people',
    fields: [
      { name: 'id', type: 'uuid' as const },
      { name: 'age', type: 'integer' as const, min: 18, max: 65 },
    ],
  }

  it('builds a recipe that holds the field schema only', () => {
    const recipe = buildRecipe(options)
    expect(recipe.version).toBe(1)
    expect(recipe.fields).toEqual(options.fields)
    expect(JSON.stringify(recipe)).not.toContain('@example')
  })

  it('restores a recipe from JSON', () => {
    const json = JSON.stringify(buildRecipe(options))
    const restored = parseRecipe(json)
    expect(restored.count).toBe(12)
    expect(restored.seed).toBe(9)
    expect(restored.tableName).toBe('people')
    expect(restored.fields).toEqual(options.fields)
  })

  it('rejects a recipe that is not valid JSON', () => {
    expect(() => parseRecipe('{oops')).toThrow(/not valid JSON/)
  })

  it('rejects a recipe with no fields', () => {
    expect(() => parseRecipe('{"count":5}')).toThrow(/"fields" array/)
  })

  it('rejects a recipe field with no name', () => {
    expect(() => parseRecipe('{"fields":[{"type":"uuid"}]}')).toThrow(/needs a name/)
  })

  it('rejects a recipe with duplicate field names', () => {
    const json = '{"fields":[{"name":"a","type":"uuid"},{"name":"a","type":"uuid"}]}'
    expect(() => parseRecipe(json)).toThrow(/Duplicate/)
  })
})
