import Ajv from 'ajv'
import addFormats from 'ajv-formats'

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

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false
})
addFormats(ajv)

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

  let validate: ReturnType<typeof ajv.compile>
  try {
    validate = ajv.compile(parsedSchema as object)
  } catch (err) {
    return {
      isValid: false,
      schemaError: `Invalid JSON Schema definition: ${err instanceof Error ? err.message : 'Schema compilation error'}`,
      errors: []
    }
  }

  const valid = validate(parsedData)

  if (valid) {
    return {
      isValid: true,
      errors: []
    }
  }

  const errors: SchemaValidationError[] = (validate.errors || []).map(err => ({
    path: err.instancePath || '/',
    message: err.message || 'Validation error',
    keyword: err.keyword,
    schemaPath: err.schemaPath
  }))

  return {
    isValid: false,
    errors
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
