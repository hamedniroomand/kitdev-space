import { describe, expect, it } from 'vitest'
import { filterAndSortRows, parseToTable } from '#shared/utils/data/table-viewer'

describe('parseToTable', () => {
  it('parses CSV input into columns and rows', () => {
    const csv = `Name,Age,Role
Alice,30,Engineer
Bob,25,Designer`
    const res = parseToTable(csv)
    expect(res.columns).toEqual(['Name', 'Age', 'Role'])
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]?.Name).toBe('Alice')
    expect(res.rows[1]?.Age).toBe('25')
  })

  it('parses JSON array of objects', () => {
    const json = JSON.stringify([
      { id: 1, title: 'First Task', done: false },
      { id: 2, title: 'Second Task', done: true },
    ])
    const res = parseToTable(json)
    expect(res.columns).toEqual(['id', 'title', 'done'])
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]?.id).toBe(1)
  })

  it('preserves difference between null, missing property, and empty string', () => {
    const json = JSON.stringify([
      { id: 1, name: null, note: '' },
      { id: 2, note: 'exists' }, // name is missing
      { id: 3, name: '', note: null },
    ])
    const res = parseToTable(json)
    expect(res.columns).toEqual(['id', 'name', 'note'])
    expect(res.rows).toHaveLength(3)

    // Row 0: name is null, note is empty string
    expect(res.rows[0]?.name).toBeNull()
    expect(res.rows[0]?.note).toBe('')

    // Row 1: name is missing (undefined), note is 'exists'
    expect(res.rows[1]?.name).toBeUndefined()
    expect(res.rows[1]?.note).toBe('exists')

    // Row 2: name is empty string, note is null
    expect(res.rows[2]?.name).toBe('')
    expect(res.rows[2]?.note).toBeNull()
  })
})

describe('filterAndSortRows', () => {
  const rows = [
    { name: 'Charlie', age: 35 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
  ]

  it('filters rows by text query', () => {
    const filtered = filterAndSortRows(rows, 'ali')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe('Alice')
  })

  it('sorts rows alphabetically ascending', () => {
    const sorted = filterAndSortRows(rows, '', 'name', true)
    expect(sorted.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts rows numerically descending', () => {
    const sorted = filterAndSortRows(rows, '', 'age', false)
    expect(sorted.map(r => r.age)).toEqual([35, 30, 25])
  })
})
