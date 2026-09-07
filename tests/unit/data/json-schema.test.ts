import { describe, expect, it } from 'vitest'
import { generateSchemaFromJson, validateJsonSchema } from '#shared/utils/data/json-schema'

describe('validateJsonSchema', () => {
  it('accepts true boolean schema as valid for any payload', () => {
    const res = validateJsonSchema('true', '{"foo": "bar"}')
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('rejects payload for false boolean schema', () => {
    const res = validateJsonSchema('false', '{"foo": "bar"}')
    expect(res.isValid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('rejects unsupported schema drafts with a clear error', () => {
    const schema = JSON.stringify({
      $schema: 'http://json-schema.org/draft-03/schema#',
      type: 'object',
    })
    const res = validateJsonSchema(schema, '{}')
    expect(res.isValid).toBe(false)
    expect(res.schemaError).toContain('Unsupported JSON Schema draft')
  })

  it('validates draft-07 schema against data', () => {
    const schema = JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    })
    const valid = validateJsonSchema(schema, '{"name": "Alice"}')
    expect(valid.isValid).toBe(true)
    expect(valid.draft).toBe('draft-07')

    const invalid = validateJsonSchema(schema, '{"name": 123}')
    expect(invalid.isValid).toBe(false)
    expect(invalid.errors.length).toBeGreaterThan(0)
  })
})

describe('generateSchemaFromJson', () => {
  it('generates a schema that accepts every item in an array of objects with different fields', () => {
    const sample = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', age: 30 },
    ]

    const schema = generateSchemaFromJson(sample)
    expect(schema.type).toBe('array')
    const items = schema.items as Record<string, unknown>
    expect(items.type).toBe('object')
    const properties = items.properties as Record<string, unknown>
    expect(properties).toHaveProperty('id')
    expect(properties).toHaveProperty('name')
    expect(properties).toHaveProperty('email')
    expect(properties).toHaveProperty('age')

    // id and name are in all items -> required
    // email and age are only in some -> optional (not in required)
    const required = items.required as string[]
    expect(required).toContain('id')
    expect(required).toContain('name')
    expect(required).not.toContain('email')
    expect(required).not.toContain('age')

    // The generated schema must validate the original sample data
    const validation = validateJsonSchema(JSON.stringify(schema), JSON.stringify(sample))
    expect(validation.isValid).toBe(true)
  })
})
