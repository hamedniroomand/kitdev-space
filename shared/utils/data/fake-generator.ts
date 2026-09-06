import { faker } from '@faker-js/faker'

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

export function generateFakeRows(options: GenerateOptions): Record<string, string | number | boolean>[] {
  if (options.seed !== undefined) {
    faker.seed(options.seed)
  }

  const rows: Record<string, string | number | boolean>[] = []
  const count = Math.max(1, Math.min(options.count, 500))

  for (let i = 0; i < count; i++) {
    const row: Record<string, string | number | boolean> = {}
    for (const field of options.fields) {
      row[field.name] = generateFieldValue(field.type, i)
    }
    rows.push(row)
  }

  return rows
}

export function formatAsSqlInserts(
  rows: Record<string, string | number | boolean>[],
  tableName = 'users'
): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0]!)
  const colList = columns.map(c => `"${c}"`).join(', ')

  const valueRows = rows.map((row) => {
    const vals = columns.map((col) => {
      const val = row[col]
      if (typeof val === 'number') return val
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
      return `'${String(val).replace(/'/g, '\'\'')}'`
    })
    return `  (${vals.join(', ')})`
  })

  return `INSERT INTO "${tableName}" (${colList}) VALUES\n${valueRows.join(',\n')};`
}

export function formatAsCsv(rows: Record<string, string | number | boolean>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0]!)
  const lines = [columns.join(',')]

  for (const row of rows) {
    const line = columns.map((col) => {
      const val = String(row[col] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    })
    lines.push(line.join(','))
  }

  return lines.join('\n')
}
