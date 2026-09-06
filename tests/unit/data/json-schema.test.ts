import { describe, expect, it } from 'vitest'
import { detectSchemaDraft, generateSchemaFromJson, validateJsonSchema } from '#shared/utils/data/json-schema'

describe('validateJsonSchema', () => {
  const sampleSchema = JSON.stringify({
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number', minimum: 0 }
    },
    required: ['name']
  })

  it('validates compliant data', () => {
    const data = JSON.stringify({ name: 'Alice', age: 30 })
    const res = validateJsonSchema(sampleSchema, data)
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('detects missing required fields', () => {
    const data = JSON.stringify({ age: 30 })
    const res = validateJsonSchema(sampleSchema, data)
    expect(res.isValid).toBe(false)
    expect(res.errors[0]?.keyword).toBe('required')
  })

  it('detects type mismatches', () => {
    const data = JSON.stringify({ name: 12345 })
    const res = validateJsonSchema(sampleSchema, data)
    expect(res.isValid).toBe(false)
    expect(res.errors[0]?.path).toBe('/name')
  })

  it('handles invalid schema json', () => {
    const res = validateJsonSchema('{ bad json', '{}')
    expect(res.isValid).toBe(false)
    expect(res.schemaError).toBeDefined()
  })

  it('collects every error, not only the first one', () => {
    const data = JSON.stringify({ name: 12345, age: -1 })
    const res = validateJsonSchema(sampleSchema, data)
    expect(res.isValid).toBe(false)
    expect(res.errors.map(e => e.path).sort()).toEqual(['/age', '/name'])
  })

  it('checks the email, ipv4, ipv6, and date formats', () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        ip: { type: 'string', format: 'ipv4' },
        ip6: { type: 'string', format: 'ipv6' },
        day: { type: 'string', format: 'date' }
      }
    })
    expect(validateJsonSchema(schema, JSON.stringify({ email: 'a@b.co', ip: '10.0.0.1', ip6: '::1', day: '2026-09-07' })).isValid).toBe(true)
    const res = validateJsonSchema(schema, JSON.stringify({ email: 'nope', ip: '999.1.1.1', ip6: 'zz', day: '2026-13-40' }))
    expect(res.isValid).toBe(false)
    expect(res.errors.map(e => e.path).sort()).toEqual(['/day', '/email', '/ip', '/ip6'])
  })

  it('reads the draft from $schema and validates 2020-12 prefixItems', () => {
    expect(detectSchemaDraft({ $schema: 'http://json-schema.org/draft-07/schema#' })).toBe('7')
    expect(detectSchemaDraft({ $schema: 'http://json-schema.org/draft-04/schema#' })).toBe('4')
    expect(detectSchemaDraft({ $schema: 'https://json-schema.org/draft/2019-09/schema' })).toBe('2019-09')
    expect(detectSchemaDraft({})).toBe('2020-12')

    const schema = JSON.stringify({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }], items: false })
    expect(validateJsonSchema(schema, JSON.stringify(['a', 1])).isValid).toBe(true)
    expect(validateJsonSchema(schema, JSON.stringify(['a', 'b'])).isValid).toBe(false)
  })

  it('rejects a schema that is not an object', () => {
    const res = validateJsonSchema('[1, 2]', '{}')
    expect(res.isValid).toBe(false)
    expect(res.schemaError).toContain('must be a JSON object')
  })
})

describe('generateSchemaFromJson', () => {
  it('generates schema for object', () => {
    const schema = generateSchemaFromJson({ id: 1, label: 'test' })
    expect(schema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        label: { type: 'string' }
      },
      required: ['id', 'label']
    })
  })
})
