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
  draft?: string
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

export interface DetectedDraft {
  draft: SchemaDraft
  displayDraft: string
  error?: string
}

/** Reads the draft from `$schema`. A schema with no `$schema` uses draft 2020-12. */
export function detectSchemaDraft(schema: unknown): DetectedDraft {
  if (typeof schema === 'boolean') {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  const id = schema && typeof schema === 'object' ? String((schema as Schema).$schema ?? '') : ''
  if (!id) {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  if (id.includes('draft-04')) {
    return { draft: '4', displayDraft: 'draft-04' }
  }
  if (id.includes('draft-06')) {
    return { draft: '7', displayDraft: 'draft-06' }
  }
  if (id.includes('draft-07')) {
    return { draft: '7', displayDraft: 'draft-07' }
  }
  if (id.includes('2019-09')) {
    return { draft: '2019-09', displayDraft: '2019-09' }
  }
  if (id.includes('2020-12')) {
    return { draft: '2020-12', displayDraft: '2020-12' }
  }

  if (/draft-0?[123]/i.test(id)) {
    return {
      draft: '2020-12',
      displayDraft: id,
      error: `Unsupported JSON Schema draft: "${id}". Supported drafts are draft-04, draft-06, draft-07, 2019-09, and 2020-12.`,
    }
  }

  return { draft: '2020-12', displayDraft: '2020-12' }
}

/** Keywords that only wrap the errors of their children. The child error names the real problem. */
const CONTAINER_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'items',
  'prefixItems',
  'allOf',
  'anyOf',
  'oneOf',
  'then',
  'else',
  'dependentSchemas',
  'contains',
  'unevaluatedProperties',
  'unevaluatedItems',
  '$ref',
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
    schemaPath: unit.keywordLocation,
  }))
}

export function validateJsonSchema(schemaInput: string, dataInput: string): SchemaValidationResult {
  const trimmedSchema = schemaInput.trim()
  const trimmedData = dataInput.trim()

  if (!trimmedSchema || !trimmedData) {
    return {
      isValid: true,
      errors: [],
    }
  }

  let parsedSchema: unknown
  try {
    parsedSchema = JSON.parse(trimmedSchema)
  }
  catch (err) {
    return {
      isValid: false,
      schemaError: `Schema JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: [],
    }
  }

  let parsedData: unknown
  try {
    parsedData = JSON.parse(trimmedData)
  }
  catch (err) {
    return {
      isValid: false,
      schemaError: undefined,
      dataError: `Data JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`,
      errors: [],
    }
  }

  const isObject = typeof parsedSchema === 'object' && parsedSchema !== null && !Array.isArray(parsedSchema)
  const isBoolean = typeof parsedSchema === 'boolean'

  if (!isObject && !isBoolean) {
    return {
      isValid: false,
      schemaError: 'Invalid JSON Schema definition: the schema must be a JSON object or boolean.',
      errors: [],
    }
  }

  const { draft, displayDraft, error: draftError } = detectSchemaDraft(parsedSchema)
  if (draftError) {
    return {
      isValid: false,
      draft: displayDraft,
      schemaError: draftError,
      errors: [],
    }
  }

  let result: ReturnType<Validator['validate']>
  try {
    // `shortCircuit: false` collects every error instead of the first one.
    const validator = new Validator(parsedSchema as Schema, draft, false)
    result = validator.validate(parsedData)
  }
  catch (err) {
    return {
      isValid: false,
      draft: displayDraft,
      schemaError: `Invalid JSON Schema definition: ${err instanceof Error ? err.message : 'Schema error'}`,
      errors: [],
    }
  }

  if (result.valid) {
    return {
      isValid: true,
      draft: displayDraft,
      errors: [],
    }
  }

  return {
    isValid: false,
    draft: displayDraft,
    errors: toErrors(result.errors),
  }
}

function mergeObjectSchemas(objects: Record<string, unknown>[]): Record<string, unknown> {
  const propKeys = new Set<string>()
  for (const obj of objects) {
    for (const k of Object.keys(obj)) {
      propKeys.add(k)
    }
  }

  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const key of propKeys) {
    const valuesWithKey: unknown[] = []
    let presentInAll = true
    for (const obj of objects) {
      if (Object.hasOwn(obj, key)) {
        valuesWithKey.push(obj[key])
      }
      else {
        presentInAll = false
      }
    }

    if (presentInAll) {
      required.push(key)
    }

    const types = new Set(valuesWithKey.map(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)))
    if (types.size === 1) {
      if (types.has('object')) {
        properties[key] = mergeObjectSchemas(valuesWithKey as Record<string, unknown>[])
      }
      else {
        properties[key] = generateSchemaFromJson(valuesWithKey[0])
      }
    }
    else {
      const anyOf = Array.from(types).map((t) => {
        const sampleVal = valuesWithKey.find(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v) === t)
        return generateSchemaFromJson(sampleVal)
      })
      properties[key] = { anyOf }
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }
}

export function generateSchemaFromJson(data: unknown): Record<string, unknown> {
  if (data === null)
    return { type: 'null' }
  if (Array.isArray(data)) {
    if (data.length === 0)
      return { type: 'array', items: {} }

    const allObjects = data.every(item => item && typeof item === 'object' && !Array.isArray(item))
    if (allObjects) {
      return {
        type: 'array',
        items: mergeObjectSchemas(data as Record<string, unknown>[]),
      }
    }

    const types = new Set(data.map(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)))
    if (types.size === 1) {
      return {
        type: 'array',
        items: generateSchemaFromJson(data[0]),
      }
    }

    const anyOf = Array.from(types).map((t) => {
      const sampleVal = data.find(v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v) === t)
      return generateSchemaFromJson(sampleVal)
    })
    return {
      type: 'array',
      items: { anyOf },
    }
  }
  const type = typeof data
  if (type === 'string')
    return { type: 'string' }
  if (type === 'number')
    return { type: Number.isInteger(data) ? 'integer' : 'number' }
  if (type === 'boolean')
    return { type: 'boolean' }
  if (type === 'object') {
    return mergeObjectSchemas([data as Record<string, unknown>])
  }
  return {}
}
