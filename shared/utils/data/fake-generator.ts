import { faker } from '@faker-js/faker'
import { formatCsvRow } from './csv'
import { quoteIdentifier, sqlLiteral } from './sql'

export type FieldType
  = | 'uuid'
    | 'integerId'
    | 'fullName'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'company'
    | 'jobTitle'
    | 'city'
    | 'country'
    | 'date'
    | 'boolean'
    | 'price'

export interface FakeFieldConfig {
  name: string
  type: FieldType
}

export interface GenerateOptions {
  count: number
  fields: FakeFieldConfig[]
  seed?: number
  tableName?: string
}

export function generateFieldValue(type: FieldType, index: number): string | number | boolean {
  switch (type) {
    case 'uuid':
      return faker.string.uuid()
    case 'integerId':
      return index + 1
    case 'fullName':
      return faker.person.fullName()
    case 'firstName':
      return faker.person.firstName()
    case 'lastName':
      return faker.person.lastName()
    case 'email':
      return faker.internet.email().toLowerCase()
    case 'phone':
      return faker.phone.number()
    case 'company':
      return faker.company.name()
    case 'jobTitle':
      return faker.person.jobTitle()
    case 'city':
      return faker.location.city()
    case 'country':
      return faker.location.country()
    case 'date':
      return faker.date.past().toISOString()
    case 'boolean':
      return faker.datatype.boolean()
    case 'price':
      return Number.parseFloat(faker.commerce.price({ min: 10, max: 500 }))
    default:
      return ''
  }
}

export function generateRowValues(
  types: FieldType[],
  count: number,
  seed?: number,
): (string | number | boolean)[][] {
  if (seed !== undefined) {
    faker.seed(seed)
  }

  const rows: (string | number | boolean)[][] = []
  const safeCount = Math.max(1, Math.min(count, 500))

  for (let i = 0; i < safeCount; i++) {
    rows.push(types.map(type => generateFieldValue(type, i)))
  }

  return rows
}

export function mapValuesToRows(
  values: (string | number | boolean)[][],
  fieldNames: string[],
): Record<string, string | number | boolean>[] {
  return values.map((row) => {
    const record: Record<string, string | number | boolean> = {}
    fieldNames.forEach((name, idx) => {
      record[name] = row[idx] ?? ''
    })
    return record
  })
}

export function generateFakeRows(options: GenerateOptions): Record<string, string | number | boolean>[] {
  const types = options.fields.map(f => f.type)
  const names = options.fields.map(f => f.name)
  const values = generateRowValues(types, options.count, options.seed)
  return mapValuesToRows(values, names)
}

export function formatAsSqlInserts(
  rows: Record<string, string | number | boolean>[],
  tableName = 'users',
): string {
  if (rows.length === 0)
    return ''
  const columns = Object.keys(rows[0]!)
  const colList = columns.map(c => quoteIdentifier(c)).join(', ')

  const valueRows = rows.map((row) => {
    const vals = columns.map(col => sqlLiteral(row[col]))
    return `  (${vals.join(', ')})`
  })

  return `INSERT INTO ${quoteIdentifier(tableName)} (${colList}) VALUES\n${valueRows.join(',\n')};`
}

export function formatAsCsv(rows: Record<string, string | number | boolean>[]): string {
  if (rows.length === 0)
    return ''
  const columns = Object.keys(rows[0]!)
  const lines = [
    formatCsvRow(columns),
    ...rows.map(row => formatCsvRow(columns.map(col => row[col]))),
  ]

  return lines.join('\n')
}
