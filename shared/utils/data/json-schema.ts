import type { OutputUnit, Schema, SchemaDraft } from '@cfworker/json-schema'
import { format, Validator } from '@cfworker/json-schema'

export interface SchemaValidationError {
  path: string
  message: string
  keyword: string
  schemaPath: string
}

export interface SchemaValidationResult {
  isValid: boolean
  schemaError?: string
  dataError?: string
  errors: SchemaValidationError[]
}

// The validator walks the schema as an interpreter. It writes no code at run
// time, so it works under a Content Security Policy with no 'unsafe-eval'.
// It ships no ipv4 and ipv6 format, so add both.
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/
const IPV6 = /^(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:|(?:[0-9a-f]{1,4}:){1,6}:[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,5}(?::[0-9a-f]{1,4}){1,2}|(?:[0-9a-f]{1,4}:){1,4}(?::[0-9a-f]{1,4}){1,3}|(?:[0-9a-f]{1,4}:){1,3}(?::[0-9a-f]{1,4}){1,4}|(?:[0-9a-f]{1,4}:){1,2}(?::[0-9a-f]{1,4}){1,5}|[0-9a-f]{1,4}:(?::[0-9a-f]{1,4}){1,6}|:(?:(?::[0-9a-f]{1,4}){1,7}|:)|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d))$/i
format.ipv4 ??= (value: string) => IPV4.test(value)
format.ipv6 ??= (value: string) => IPV6.test(value)

/** Reads the draft from `$schema`. A schema with no `$schema` uses draft 2020-12, the current one. */
export function detectSchemaDraft(schema: unknown): SchemaDraft {
  const id = schema && typeof schema === 'object' ? String((schema as Schema).$schema ?? '') : ''
  if (id.includes('draft-04')) {
    return '4'
  }
  if (id.includes('draft-06') || id.includes('draft-07')) {
    return '7'
  }
  if (id.includes('2019-09')) {
    return '2019-09'
  }
  return '2020-12'
}

/** Keywords that only wrap the errors of their children. The child error names the real problem. */
const CONTAINER_KEYWORDS = new Set([
  'properties', 'patternProperties', 'items', 'prefixItems', 'allOf', 'anyOf', 'oneOf',
  'then', 'else', 'dependentSchemas', 'contains', 'unevaluatedProperties', 'unevaluatedItems', '$ref'
])

function toPath(location: string): string {
  const path = location.replace(/^#/, '')
  return path || '/'
}

function toErrors(units: OutputUnit[]): SchemaValidationError[] {
  const leaves = units.filter(unit => !CONTAINER_KEYWORDS.has(unit.keyword))
  return (leaves.length ? leaves : units).map(unit => ({
    path: toPath(unit.instanceLocation),
    message: unit.error,
    keyword: unit.keyword,
    schemaPath: unit.keywordLocation
  }))
}

export function validateJsonSchema(schemaInput: string, dataInput: string): SchemaValidationResult {
  const trimmedSchema = schemaInput.trim()
  const trimmedData = dataInput.trim()

  if (!trimmedSchema || !trimmedData) {
    return {
      isValid: true,
      errors: []
    }
  }

  let parsedSchema: unknown
  try {
    parsedSchema = JSON.parse(trimmedSchema)
  } catch (err) {
    return {
      isValid: false,
      schemaError: `Schema JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: []
    }
  }

  let parsedData: unknown
  try {
    parsedData = JSON.parse(trimmedData)
  } catch (err) {
    return {
      isValid: false,
      dataError: `Data JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: []
    }
  }

  if (typeof parsedSchema !== 'object' || parsedSchema === null || Array.isArray(parsedSchema)) {
    return {
      isValid: false,
      schemaError: 'Invalid JSON Schema definition: the schema must be a JSON object.',
      errors: []
    }
  }

  let result: ReturnType<Validator['validate']>
  try {
    // `shortCircuit: false` collects every error instead of the first one.
    const validator = new Validator(parsedSchema as Schema, detectSchemaDraft(parsedSchema), false)
    result = validator.validate(parsedData)
  } catch (err) {
    return {
      isValid: false,
      schemaError: `Invalid JSON Schema definition: ${err instanceof Error ? err.message : 'Schema error'}`,
      errors: []
    }
  }

  if (result.valid) {
    return {
      isValid: true,
      errors: []
    }
  }

  return {
    isValid: false,
    errors: toErrors(result.errors)
  }
}

export function generateSchemaFromJson(data: unknown): Record<string, unknown> {
  if (data === null) return { type: 'null' }
  if (Array.isArray(data)) {
    if (data.length === 0) return { type: 'array', items: {} }
    return {
      type: 'array',
      items: generateSchemaFromJson(data[0])
    }
  }
  const type = typeof data
  if (type === 'string') return { type: 'string' }
  if (type === 'number') return { type: Number.isInteger(data) ? 'integer' : 'number' }
  if (type === 'boolean') return { type: 'boolean' }
  if (type === 'object') {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      properties[k] = generateSchemaFromJson(v)
      required.push(k)
    }
    return {
      type: 'object',
      properties,
      required
    }
  }
  return {}
}
