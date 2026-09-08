import { describe, expect, it } from 'vitest'
import {
  extractPreviewData,
  inferColumnType,
  isLeadingZeroIdentifier,
} from '#shared/utils/data/csv-preview'

describe('csv preview and column type detection', () => {
  it('detects identifiers with leading zeros as text to prevent truncation', () => {
    expect(isLeadingZeroIdentifier('01234')).toBe(true)
    expect(isLeadingZeroIdentifier('007')).toBe(true)
    expect(isLeadingZeroIdentifier('+0123')).toBe(true)
    expect(isLeadingZeroIdentifier('1234')).toBe(false)
    expect(isLeadingZeroIdentifier('0')).toBe(false)

    expect(inferColumnType(['01234', '05678'])).toBe('text')
    expect(inferColumnType(['1234', '5678'])).toBe('number')
  })

  it('infers boolean column type for boolean values', () => {
    expect(inferColumnType(['true', 'false', 'True', 'FALSE'])).toBe('boolean')
  })

  it('infers date column type for ISO and standard date values', () => {
    expect(inferColumnType(['2025-01-01', '2025-02-15', '2025-03-30'])).toBe('date')
  })

  it('infers number column type for integers and decimals', () => {
    expect(inferColumnType(['42', '3.14', '-10'])).toBe('number')
  })

  it('falls back to text for mixed or arbitrary text', () => {
    expect(inferColumnType(['Ada', 'Grace', 'Alan'])).toBe('text')
    expect(inferColumnType(['10', 'Ada', 'true'])).toBe('text')
  })

  it('extracts up to 50 preview rows from CSV with inferred column types', () => {
    const lines = ['id,code,name,score,active,date']
    for (let i = 1; i <= 60; i++) {
      lines.push(`${i},00${i},User${i},${i * 1.5},true,2025-01-${String(i % 28 + 1).padStart(2, '0')}`)
    }
    const csv = lines.join('\n')
    const preview = extractPreviewData(csv, 'csv', 50)

    expect(preview.rows).toHaveLength(50)
    expect(preview.totalRows).toBe(60)
    expect(preview.columns).toHaveLength(6)

    expect(preview.columns[0]).toEqual({ name: 'id', type: 'number' })
    expect(preview.columns[1]).toEqual({ name: 'code', type: 'text' }) // leading zeros preserved as text
    expect(preview.columns[2]).toEqual({ name: 'name', type: 'text' })
    expect(preview.columns[3]).toEqual({ name: 'score', type: 'number' })
    expect(preview.columns[4]).toEqual({ name: 'active', type: 'boolean' })
    expect(preview.columns[5]).toEqual({ name: 'date', type: 'date' })
  })

  it('extracts preview rows from JSON array of objects', () => {
    const json = JSON.stringify([
      { id: 1, zip: '02138', active: true, registered: '2024-05-01' },
      { id: 2, zip: '07030', active: false, registered: '2024-06-12' },
    ])
    const preview = extractPreviewData(json, 'json', 50)

    expect(preview.rows).toHaveLength(2)
    expect(preview.totalRows).toBe(2)
    expect(preview.columns).toEqual([
      { name: 'id', type: 'number' },
      { name: 'zip', type: 'text' },
      { name: 'active', type: 'boolean' },
      { name: 'registered', type: 'date' },
    ])
  })
})
