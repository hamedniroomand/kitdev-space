import { describe, expect, it } from 'vitest'
import {
  convertCsvJsonSql,
  csvToJson,
  csvToSqlInsert,
  detectDelimiter,
  jsonToCsv,
  parseCsv,
} from '#shared/utils/data/csv'

describe('detectDelimiter', () => {
  it('detects commas', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',')
  })

  it('detects semicolons', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';')
  })

  it('detects tabs', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t')
  })
})

describe('parseCsv', () => {
  it('parses quoted fields with commas and escaped quotes', () => {
    expect(parseCsv('name,city\nAda,"London, ""UK"""')).toEqual([
      ['name', 'city'],
      ['Ada', 'London, "UK"'],
    ])
  })

  it('rejects unclosed quotes', () => {
    expect(() => parseCsv('a,"b')).toThrow('unclosed quote')
  })
})

describe('csvToJson', () => {
  it('converts header rows into objects with coerced values', () => {
    expect(csvToJson('name;age;active\nAda;36;true', { delimiter: ';' })).toEqual([
      { name: 'Ada', age: 36, active: true },
    ])
  })

  it('returns arrays when header is disabled', () => {
    expect(csvToJson('Ada,36\nGrace,45', { header: false })).toEqual([
      ['Ada', 36],
      ['Grace', 45],
    ])
  })
})

describe('jsonToCsv', () => {
  it('converts object arrays to CSV', () => {
    expect(jsonToCsv([
      { name: 'Ada', city: 'London, UK' },
      { name: 'Grace', city: 'New York' },
    ])).toBe('name,city\nAda,"London, UK"\nGrace,New York')
  })

  it('converts array rows to CSV', () => {
    expect(jsonToCsv([['a', 'b'], ['1', '2']], { delimiter: ';' })).toBe('a;b\n1;2')
  })
})

describe('csvToSqlInsert', () => {
  it('builds INSERT statements with a custom table name', () => {
    const sql = csvToSqlInsert('id,name\n1,Ada\n2,O\'Neil', 'users')
    expect(sql).toBe(
      'INSERT INTO users (id, name) VALUES (1, \'Ada\');\nINSERT INTO users (id, name) VALUES (2, \'O\'\'Neil\');',
    )
  })

  it('rejects unsafe table names', () => {
    expect(() => csvToSqlInsert('a\n1', 'users;drop')).toThrow('table name')
  })
})

describe('convertCsvJsonSql', () => {
  it('converts CSV to pretty JSON and reports the delimiter', () => {
    const result = convertCsvJsonSql({
      mode: 'csv-json',
      text: 'name\trole\nAda\tEngineer',
    })
    expect(result.delimiter).toBe('\t')
    expect(JSON.parse(result.output)).toEqual([{ name: 'Ada', role: 'Engineer' }])
  })
})
