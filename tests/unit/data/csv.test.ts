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

  it('keeps numbers with leading zeros and integers with >15 digits as strings', () => {
    expect(csvToJson('zip,card\n02134,1234567890123456')).toEqual([
      { zip: '02134', card: '1234567890123456' },
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

describe('csv parse error reporting and row exclusion', () => {
  it('reports specific row number for unclosed quotes', () => {
    expect(() => parseCsv('name,city\nAda,"London')).toThrow('CSV has an unclosed quote on row 2.')
  })

  it('reports specific row number for mismatched column count', () => {
    const csv = 'id,name,role\n1,Ada,Engineer\n2,Grace\n3,Alan,Mathematician'
    expect(() => parseCsv(csv)).toThrow('Row 3 has 2 columns, expected 3.')
  })

  it('never mistakenly treats invalid JSON as CSV', () => {
    const invalidJson = '[{"name": "Ada",}]'
    expect(() => parseCsv(invalidJson)).toThrow(/Invalid JSON input/)
  })

  it('allows excluding invalid rows from dataset when excludeInvalidRows is enabled', () => {
    const csv = 'id,name,role\n1,Ada,Engineer\n2,Grace\n3,Alan,Mathematician'
    const result = parseCsv(csv, { excludeInvalidRows: true })
    expect(result).toEqual([
      ['id', 'name', 'role'],
      ['1', 'Ada', 'Engineer'],
      ['3', 'Alan', 'Mathematician'],
    ])
  })

  it('reports excluded count in convertCsvJsonSql when excluding invalid rows', () => {
    const csv = 'id,name,role\n1,Ada,Engineer\n2,Grace\n3,Alan,Mathematician'
    const result = convertCsvJsonSql({
      mode: 'csv-json',
      text: csv,
      excludeInvalidRows: true,
    })
    expect(result.excludedRowCount).toBe(1)
    const json = JSON.parse(result.output)
    expect(json).toHaveLength(2)
    expect(json[0].name).toBe('Ada')
    expect(json[1].name).toBe('Alan')
  })

  it('rejects invalid JSON in jsonToCsv with informative error', () => {
    expect(() => jsonToCsv('{ invalid }')).toThrow('Invalid JSON syntax')
  })
})
