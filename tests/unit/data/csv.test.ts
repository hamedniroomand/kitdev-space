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

describe('csv null, empty, and missing value handling', () => {
  const datasetWithNullAndEmpty = [
    { id: 1, name: 'Ada', notes: null },
    { id: 2, name: 'Grace', notes: '' },
    { id: 3, name: 'Alan' }, // notes is missing
  ]

  it('exports null as "null" and empty string as quoted by default in jsonToCsv', () => {
    const csv = jsonToCsv(datasetWithNullAndEmpty)
    expect(csv).toBe('id,name,notes\n1,Ada,null\n2,Grace,""\n3,Alan,null')
  })

  it('supports NULL representation for null and missing fields in jsonToCsv', () => {
    const csv = jsonToCsv(datasetWithNullAndEmpty, {
      nullValue: 'NULL',
      emptyStringValue: 'empty',
    })
    expect(csv).toBe('id,name,notes\n1,Ada,NULL\n2,Grace,\n3,Alan,NULL')
  })

  it('supports \\N representation for null values', () => {
    const csv = jsonToCsv(datasetWithNullAndEmpty, {
      nullValue: '\\N',
      emptyStringValue: 'quoted',
    })
    expect(csv).toBe('id,name,notes\n1,Ada,\\N\n2,Grace,""\n3,Alan,\\N')
  })

  it('supports empty string representation for missing fields when configured', () => {
    const csv = jsonToCsv(datasetWithNullAndEmpty, {
      nullValue: 'NULL',
      emptyStringValue: 'quoted',
      missingFieldValue: 'empty',
    })
    expect(csv).toBe('id,name,notes\n1,Ada,NULL\n2,Grace,""\n3,Alan,""')
  })

  it('quotes literal string "null" to preserve distinction from null value', () => {
    const data = [
      { id: 1, text: 'null' },
      { id: 2, text: null },
    ]
    const csv = jsonToCsv(data, { nullValue: 'null' })
    expect(csv).toBe('id,text\n1,"null"\n2,null')
  })

  it('distinguishes empty string from null in csvToJson', () => {
    const csv = 'id,name,notes\n1,Ada,null\n2,Grace,""\n3,Alan,'
    // Default: null is null, quoted "" is empty string, unquoted empty is empty string
    const json1 = csvToJson(csv)
    expect(json1).toEqual([
      { id: 1, name: 'Ada', notes: null },
      { id: 2, name: 'Grace', notes: '' },
      { id: 3, name: 'Alan', notes: '' },
    ])

    // With nullValue: 'empty', unquoted empty is parsed as null, while quoted "" stays empty string
    const json2 = csvToJson(csv, { nullValue: 'empty' })
    expect(json2).toEqual([
      { id: 1, name: 'Ada', notes: null },
      { id: 2, name: 'Grace', notes: '' },
      { id: 3, name: 'Alan', notes: null },
    ])
  })

  it('preserves distinction between null and empty string in csvToSqlInsert', () => {
    const csv = 'id,name,bio\n1,Ada,null\n2,Grace,""\n3,Alan,'
    const sql = csvToSqlInsert(csv, 'users')
    expect(sql).toBe(
      'INSERT INTO users (id, name, bio) VALUES (1, \'Ada\', NULL);\n'
      + 'INSERT INTO users (id, name, bio) VALUES (2, \'Grace\', \'\');\n'
      + 'INSERT INTO users (id, name, bio) VALUES (3, \'Alan\', \'\');',
    )

    const sqlEmptyAsNull = csvToSqlInsert(csv, 'users', { nullValue: 'empty' })
    expect(sqlEmptyAsNull).toBe(
      'INSERT INTO users (id, name, bio) VALUES (1, \'Ada\', NULL);\n'
      + 'INSERT INTO users (id, name, bio) VALUES (2, \'Grace\', \'\');\n'
      + 'INSERT INTO users (id, name, bio) VALUES (3, \'Alan\', NULL);',
    )
  })

  it('forwards null and empty value options in convertCsvJsonSql', () => {
    const result = convertCsvJsonSql({
      mode: 'json-csv',
      text: JSON.stringify(datasetWithNullAndEmpty),
      nullValue: 'NULL',
      emptyStringValue: 'quoted',
      missingFieldValue: 'empty',
    })
    expect(result.output).toBe('id,name,notes\n1,Ada,NULL\n2,Grace,""\n3,Alan,""')
  })
})
