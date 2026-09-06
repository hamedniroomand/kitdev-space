import { describe, expect, it } from 'vitest'
import { filterAndSortRows, parseToTable } from '../../../shared/utils/data/table-viewer'

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
      { id: 2, title: 'Second Task', done: true }
    ])
    const res = parseToTable(json)
    expect(res.columns).toEqual(['id', 'title', 'done'])
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]?.id).toBe(1)
  })
})

describe('filterAndSortRows', () => {
  const rows = [
    { name: 'Charlie', age: 35 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
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
