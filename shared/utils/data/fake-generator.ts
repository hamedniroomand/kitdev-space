import { faker } from '@faker-js/faker/locale/en'
import { formatCsvRow } from './csv'
import { DataError } from './errors'
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
    | 'integer'
    | 'float'
    | 'enum'

export type FakeValue = string | number | boolean | null

export interface FakeFieldConfig {
  name: string
  type: FieldType
  min?: number
  max?: number
  enumValues?: string[]
  dateFrom?: string
  dateTo?: string
  /** Percent of rows that get `null`, from 0 to 100. */
  nullRate?: number
  unique?: boolean
}

export interface GenerateOptions {
  count: number
  fields: FakeFieldConfig[]
  seed?: number
  /** Anchors every relative date, so a seeded run stays the same on any day. */
  refDate?: string
  tableName?: string
  sqlDialect?: string
}

export const MAX_ROWS = 500

/** Attempts to find a new value for a unique field before the generator stops. */
const UNIQUE_ATTEMPTS = 200

export function validateFields(fields: FakeFieldConfig[]): string | null {
  if (fields.length === 0) {
    return 'Add at least one field.'
  }
  const seen = new Set<string>()
  for (const field of fields) {
    const name = field.name.trim()
    if (!name) {
      return 'A field name cannot be blank.'
    }
    if (seen.has(name)) {
      return `Duplicate field name: "${name}".`
    }
    seen.add(name)
  }
  return null
}

function rawValue(field: FakeFieldConfig, index: number): FakeValue {
  switch (field.type) {
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
    case 'boolean':
      return faker.datatype.boolean()
    case 'price':
      return faker.number.float({
        min: field.min ?? 10,
        max: field.max ?? 500,
        fractionDigits: 2,
      })
    case 'integer':
      return faker.number.int({ min: field.min ?? 0, max: field.max ?? 1000 })
    case 'float':
      return faker.number.float({
        min: field.min ?? 0,
        max: field.max ?? 1000,
        fractionDigits: 2,
      })
    case 'enum': {
      const values = field.enumValues?.filter(v => v.trim()) ?? []
      return values.length > 0 ? faker.helpers.arrayElement(values) : ''
    }
    case 'date': {
      if (field.dateFrom && field.dateTo) {
        return faker.date.between({ from: field.dateFrom, to: field.dateTo }).toISOString()
      }
      return faker.date.past().toISOString()
    }
    default:
      return ''
  }
}

export function generateFieldValue(field: FakeFieldConfig, index: number): FakeValue {
  const nullRate = field.nullRate ?? 0
  if (nullRate > 0 && faker.number.int({ min: 1, max: 100 }) <= nullRate) {
    return null
  }
  return rawValue(field, index)
}

/**
 * Builds the value matrix, one array for each row. The page keeps this matrix
 * so a rename or a format change reuses the values instead of new data.
 */
export function generateFieldValues(options: GenerateOptions): FakeValue[][] {
  const invalid = validateFields(options.fields)
  if (invalid) {
    throw new DataError(invalid)
  }

  if (options.seed !== undefined) {
    faker.seed(options.seed)
  }
  // A relative date such as "past" moves every day. Anchoring it keeps a
  // seeded run identical on a later day.
  faker.setDefaultRefDate(options.refDate ? new Date(options.refDate) : new Date('2024-01-01T00:00:00.000Z'))

  const safeCount = Math.max(1, Math.min(options.count, MAX_ROWS))
  const values: FakeValue[][] = []
  const usedValues = options.fields.map(() => new Set<string>())

  for (let index = 0; index < safeCount; index++) {
    const row: FakeValue[] = []
    options.fields.forEach((field, fieldIndex) => {
      if (!field.unique) {
        row.push(generateFieldValue(field, index))
        return
      }

      const seen = usedValues[fieldIndex]!
      let value = generateFieldValue(field, index)
      let attempts = 0
      while (value !== null && seen.has(String(value)) && attempts < UNIQUE_ATTEMPTS) {
        value = generateFieldValue(field, index)
        attempts++
      }
      if (value !== null && seen.has(String(value))) {
        throw new DataError(
          `Cannot find ${safeCount} unique values for "${field.name}". Widen the range or turn off Unique.`,
        )
      }
      if (value !== null) {
        seen.add(String(value))
      }
      row.push(value)
    })
    values.push(row)
  }

  return values
}

export function generateFakeRows(options: GenerateOptions): Record<string, FakeValue>[] {
  return mapValuesToRows(
    generateFieldValues(options),
    options.fields.map((f, idx) => f.name.trim() || `field_${idx + 1}`),
  )
}

export function mapValuesToRows(
  values: FakeValue[][],
  fieldNames: string[],
): Record<string, FakeValue>[] {
  return values.map((row) => {
    const record: Record<string, FakeValue> = {}
    fieldNames.forEach((name, idx) => {
      // A null is a real generated value, so only a missing column becomes ''.
      record[name] = idx < row.length ? row[idx]! : ''
    })
    return record
  })
}

function sqlColumnType(rows: Record<string, FakeValue>[], column: string): string {
  for (const row of rows) {
    const value = row[column]
    if (value === null || value === undefined) {
      continue
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN'
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'DECIMAL(12,2)'
    }
    return 'TEXT'
  }
  return 'TEXT'
}

export function generateCreateTable(
  rows: Record<string, FakeValue>[],
  tableName = 'users',
  dialect = 'sql',
): string {
  if (rows.length === 0) {
    return ''
  }
  const columns = Object.keys(rows[0]!)
  const lines = columns.map(
    col => `  ${quoteIdentifier(col, dialect)} ${sqlColumnType(rows, col)}`,
  )
  return `CREATE TABLE ${quoteIdentifier(tableName, dialect)} (\n${lines.join(',\n')}\n);`
}

export function formatAsSqlInserts(
  rows: Record<string, FakeValue>[],
  tableName = 'users',
  dialect = 'sql',
  includeCreateTable = false,
): string {
  if (rows.length === 0) {
    return ''
  }
  const columns = Object.keys(rows[0]!)
  const colList = columns.map(c => quoteIdentifier(c, dialect)).join(', ')

  const valueRows = rows.map((row) => {
    const vals = columns.map(col => sqlLiteral(row[col]))
    return `  (${vals.join(', ')})`
  })

  const insert = `INSERT INTO ${quoteIdentifier(tableName, dialect)} (${colList}) VALUES\n${valueRows.join(',\n')};`
  return includeCreateTable
    ? `${generateCreateTable(rows, tableName, dialect)}\n\n${insert}`
    : insert
}

export function formatAsCsv(rows: Record<string, FakeValue>[]): string {
  if (rows.length === 0) {
    return ''
  }
  const columns = Object.keys(rows[0]!)
  const lines = [
    formatCsvRow(columns),
    ...rows.map(row => formatCsvRow(columns.map(col => row[col]))),
  ]

  return lines.join('\n')
}

export interface FakeRecipe {
  version: 1
  count: number
  seed?: number
  refDate?: string
  tableName?: string
  fields: FakeFieldConfig[]
}

export function buildRecipe(options: GenerateOptions): FakeRecipe {
  return {
    version: 1,
    count: options.count,
    seed: options.seed,
    refDate: options.refDate,
    tableName: options.tableName,
    fields: options.fields,
  }
}

export function parseRecipe(input: string): FakeRecipe {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  }
  catch (cause) {
    throw new DataError('The recipe file is not valid JSON.', { cause })
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DataError('A recipe must be a JSON object.')
  }

  const recipe = parsed as Partial<FakeRecipe>
  if (!Array.isArray(recipe.fields) || recipe.fields.length === 0) {
    throw new DataError('A recipe needs a "fields" array.')
  }

  const fields: FakeFieldConfig[] = recipe.fields.map((field, idx) => {
    if (!field || typeof field !== 'object') {
      throw new DataError(`Field ${idx + 1} in the recipe is not an object.`)
    }
    if (typeof field.name !== 'string' || !field.name.trim()) {
      throw new DataError(`Field ${idx + 1} in the recipe needs a name.`)
    }
    return field
  })

  const invalid = validateFields(fields)
  if (invalid) {
    throw new DataError(invalid)
  }

  return {
    version: 1,
    count: typeof recipe.count === 'number' ? recipe.count : 10,
    seed: typeof recipe.seed === 'number' ? recipe.seed : undefined,
    refDate: typeof recipe.refDate === 'string' ? recipe.refDate : undefined,
    tableName: typeof recipe.tableName === 'string' ? recipe.tableName : undefined,
    fields,
  }
}
