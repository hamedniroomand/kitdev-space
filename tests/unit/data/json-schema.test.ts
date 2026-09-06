import { describe, expect, it } from 'vitest'
import { generateSchemaFromJson, validateJsonSchema } from '../../../shared/utils/data/json-schema'

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
