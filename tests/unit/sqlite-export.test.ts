import { describe, expect, it } from 'vitest'
import { rowsToCsv, rowsToJson } from '~/utils/sqlite/export'

describe('SQLite Data Exporters', () => {
  const columns = ['id', 'name', 'price']
  const rows = [
    [1, 'Keyboard', 89.99],
    [2, 'Mouse, Wireless', 29.5]
  ]

  it('converts rows to CSV with proper quoting', () => {
    const csv = rowsToCsv(columns, rows)
    expect(csv).toContain('id,name,price')
    expect(csv).toContain('1,Keyboard,89.99')
    expect(csv).toContain('2,"Mouse, Wireless",29.5')
  })

  it('converts rows to formatted JSON array', () => {
    const json = rowsToJson(columns, rows)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ id: 1, name: 'Keyboard', price: 89.99 })
  })
})
