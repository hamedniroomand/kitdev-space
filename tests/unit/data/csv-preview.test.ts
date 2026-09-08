import { describe, expect, it } from 'vitest'
import {
  exportFilteredDataset,
  extractPreviewData,
  filterRows,
  getDownloadFilename,
  inferColumnType,
  isLeadingZeroIdentifier,
  processHeavyCsvWorker,
  sortRows,
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

describe('csv preview filterRows and sortRows', () => {
  const sampleRows = [
    ['1', 'Ada', '36', 'true', '2020-01-01'],
    ['2', 'Grace', '45', 'false', '2015-06-15'],
    ['3', 'Alan', '41', 'true', '2022-10-31'],
    ['4', 'Margaret', '28', 'false', '2024-03-01'],
  ]

  it('filters rows by column text values case-insensitively', () => {
    const filtered = filterRows(sampleRows, { 1: 'ar' })
    expect(filtered).toEqual([['4', 'Margaret', '28', 'false', '2024-03-01']])
    const filteredAlan = filterRows(sampleRows, { 1: 'alan' })
    expect(filteredAlan).toEqual([['3', 'Alan', '41', 'true', '2022-10-31']])
  })

  it('combines multiple column filters', () => {
    const filtered = filterRows(sampleRows, { 1: 'a', 3: 'true' })
    expect(filtered).toEqual([
      ['1', 'Ada', '36', 'true', '2020-01-01'],
      ['3', 'Alan', '41', 'true', '2022-10-31'],
    ])
  })

  it('sorts rows numerically when column type is number', () => {
    const sortedAsc = sortRows(sampleRows, { columnIndex: 2, direction: 'asc' }, 'number')
    expect(sortedAsc.map(r => r[1])).toEqual(['Margaret', 'Ada', 'Alan', 'Grace']) // 28, 36, 41, 45

    const sortedDesc = sortRows(sampleRows, { columnIndex: 2, direction: 'desc' }, 'number')
    expect(sortedDesc.map(r => r[1])).toEqual(['Grace', 'Alan', 'Ada', 'Margaret'])
  })

  it('sorts rows by date when column type is date', () => {
    const sortedAsc = sortRows(sampleRows, { columnIndex: 4, direction: 'asc' }, 'date')
    expect(sortedAsc.map(r => r[1])).toEqual(['Grace', 'Ada', 'Alan', 'Margaret']) // 2015, 2020, 2022, 2024
  })

  it('sorts rows alphabetically for text columns', () => {
    const sortedAsc = sortRows(sampleRows, { columnIndex: 1, direction: 'asc' }, 'text')
    expect(sortedAsc.map(r => r[1])).toEqual(['Ada', 'Alan', 'Grace', 'Margaret'])
  })
})

describe('csv distinct download actions and filenames', () => {
  it('generates distinct filenames indicating all vs filtered export', () => {
    expect(getDownloadFilename('csv-json', false)).toBe('converted-all.json')
    expect(getDownloadFilename('csv-json', true)).toBe('converted-filtered.json')

    expect(getDownloadFilename('json-csv', false)).toBe('converted-all.csv')
    expect(getDownloadFilename('json-csv', true)).toBe('converted-filtered.csv')

    expect(getDownloadFilename('csv-sql', false)).toBe('inserts-all.sql')
    expect(getDownloadFilename('csv-sql', true)).toBe('inserts-filtered.sql')
  })

  it('exports filtered dataset to JSON with selected columns and filtered rows', () => {
    const columns = [
      { name: 'id', type: 'number' as const },
      { name: 'name', type: 'text' as const },
      { name: 'role', type: 'text' as const },
    ]
    const rows = [
      ['1', 'Ada', 'Engineer'],
      ['2', 'Grace', 'Scientist'],
      ['3', 'Alan', 'Engineer'],
    ]

    const result = exportFilteredDataset({
      rows,
      columns,
      columnFilters: { 2: 'engineer' },
      visibleColumnIndices: [0, 1], // exclude role column
      mode: 'csv-json',
    })

    const parsed = JSON.parse(result)
    expect(parsed).toEqual([
      { id: 1, name: 'Ada' },
      { id: 3, name: 'Alan' },
    ])
  })

  it('exports filtered dataset to SQL with custom table name and filtered rows', () => {
    const columns = [
      { name: 'id', type: 'number' as const },
      { name: 'name', type: 'text' as const },
    ]
    const rows = [
      ['1', 'Ada'],
      ['2', 'Grace'],
    ]

    const sql = exportFilteredDataset({
      rows,
      columns,
      columnFilters: { 1: 'Grace' },
      mode: 'csv-sql',
      tableName: 'admins',
    })

    expect(sql).toBe('INSERT INTO "admins" ("id", "name") VALUES (2, \'Grace\');')
  })

  it('exports filtered dataset to CSV preserving delimiter and format', () => {
    const columns = [
      { name: 'id', type: 'number' as const },
      { name: 'name', type: 'text' as const },
    ]
    const rows = [
      ['1', 'Ada'],
      ['2', 'Grace'],
    ]

    const csv = exportFilteredDataset({
      rows,
      columns,
      columnFilters: { 1: 'Ada' },
      mode: 'json-csv',
      delimiter: ';',
    })

    expect(csv).toBe('id;name\n1;Ada')
  })

  it('exports to TSV and Markdown table', () => {
    const columns = [
      { name: 'city', type: 'text' as const },
      { name: 'pop', type: 'number' as const },
    ]
    const rows = [
      ['Paris', '2161000'],
      ['Tokyo', '13960000'],
    ]

    const tsv = exportFilteredDataset({
      rows,
      columns,
      format: 'tsv',
    })
    expect(tsv).toBe('city\tpop\nParis\t2161000\nTokyo\t13960000')

    const md = exportFilteredDataset({
      rows,
      columns,
      format: 'markdown',
    })
    expect(md).toContain('| city')
    expect(md).toContain('| Paris')
    expect(md).toContain('| Tokyo')
  })

  it('exports SQL with CREATE TABLE and dialect-specific identifier quoting', () => {
    const columns = [
      { name: 'user id', type: 'number' as const },
      { name: 'full name', type: 'text' as const },
      { name: 'is active', type: 'boolean' as const },
    ]
    const rows = [
      ['10', 'Alice', 'true'],
    ]

    // MySQL dialect uses backticks
    const mysqlResult = exportFilteredDataset({
      rows,
      columns,
      format: 'sql',
      sqlDialect: 'mysql',
      tableName: 'app users',
      includeCreateTable: true,
    })
    expect(mysqlResult).toContain('CREATE TABLE `app users` (')
    expect(mysqlResult).toContain('`user id` DOUBLE')
    expect(mysqlResult).toContain('`is active` TINYINT(1)')
    expect(mysqlResult).toContain('INSERT INTO `app users` (`user id`, `full name`, `is active`) VALUES (10, \'Alice\', TRUE);')

    // PostgreSQL dialect uses double quotes
    const pgResult = exportFilteredDataset({
      rows,
      columns,
      format: 'sql',
      sqlDialect: 'postgresql',
      tableName: 'app_users',
      includeCreateTable: true,
    })
    expect(pgResult).toContain('CREATE TABLE "app_users" (')
    expect(pgResult).toContain('"user id" NUMERIC')
    expect(pgResult).toContain('"is active" BOOLEAN')
    expect(pgResult).toContain('INSERT INTO "app_users" ("user id", "full name", "is active") VALUES (10, \'Alice\', TRUE);')
  })

  it('processes heavy CSV parsing and filtering in worker helper without freezing', () => {
    // Generate simulated heavy CSV (10,000 rows)
    const lines = ['id,name,role,department']
    for (let i = 1; i <= 10_000; i++) {
      lines.push(`${i},Person ${i},${i % 2 === 0 ? 'Dev' : 'Designer'},Engineering`)
    }
    const heavyCsv = lines.join('\n')

    const result = processHeavyCsvWorker({
      text: heavyCsv,
      filterText: 'designer',
      filterColIndex: 2,
    })

    expect(result.totalRows).toBe(10_001)
    expect(result.filteredRowsCount).toBe(5_000)
  })
})
