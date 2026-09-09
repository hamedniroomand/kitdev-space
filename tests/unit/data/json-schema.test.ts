import { describe, expect, it } from 'vitest'
import { generateSchemaFromJson, parseTestCases, runSchemaTestCases, validateJsonSchema } from '#shared/utils/data/json-schema'

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

describe('local $ref resolution', () => {
  const mainSchema = JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: { addr: { $ref: 'https://example.com/address.json' } },
    required: ['addr'],
  })

  const addressSchema = JSON.stringify({
    $id: 'https://example.com/address.json',
    type: 'object',
    properties: { zip: { type: 'string' } },
    required: ['zip'],
  })

  it('resolves a $ref against a local schema', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{"zip":"123"}}', addressSchema)
    expect(res.isValid).toBe(true)
    expect(res.refError).toBeUndefined()
    expect(res.resolvedRefIds).toEqual(['https://example.com/address.json'])
  })

  it('reports an error inside a locally resolved schema', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{}}', addressSchema)
    expect(res.isValid).toBe(false)
    expect(res.errors.some(e => e.message.includes('zip'))).toBe(true)
  })

  it('rejects a remote $ref with a security notice when no local schema matches', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{"zip":"1"}}')
    expect(res.isValid).toBe(false)
    expect(res.refError).toContain('never fetches a schema over the network')
    expect(res.refError).toContain('https://example.com/address.json')
  })

  it('accepts an array of referenced schemas', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{"zip":"123"}}', `[${addressSchema}]`)
    expect(res.isValid).toBe(true)
  })

  it('rejects a referenced schema with no $id', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{"zip":"1"}}', '{"type":"object"}')
    expect(res.refError).toContain('$id')
  })

  it('rejects a referenced schema that is not valid JSON', () => {
    const res = validateJsonSchema(mainSchema, '{"addr":{"zip":"1"}}', '{oops')
    expect(res.refError).toContain('parse error')
  })

  it('leaves a local pointer $ref alone', () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: { a: { $ref: '#/$defs/x' } },
      $defs: { x: { type: 'string' } },
    })
    const res = validateJsonSchema(schema, '{"a":"ok"}')
    expect(res.refError).toBeUndefined()
    expect(res.isValid).toBe(true)
  })
})

describe('anyOf and oneOf branch grouping', () => {
  const schema = JSON.stringify({
    type: 'object',
    properties: {
      v: { anyOf: [{ type: 'string' }, { type: 'number', minimum: 10 }] },
    },
  })

  it('groups each branch of a failed anyOf', () => {
    const res = validateJsonSchema(schema, '{"v":true}')
    expect(res.isValid).toBe(false)
    expect(res.branchGroups).toHaveLength(1)
    expect(res.branchGroups[0]?.keyword).toBe('anyOf')
    expect(res.branchGroups[0]?.branches.map(b => b.index)).toEqual([0, 1])
  })

  it('names the reason that each branch failed', () => {
    const res = validateJsonSchema(schema, '{"v":true}')
    const branches = res.branchGroups[0]!.branches
    expect(branches[0]?.errors[0]?.message).toContain('string')
    expect(branches[1]?.errors[0]?.message).toContain('number')
  })

  it('points at the anyOf keyword in the schema', () => {
    const res = validateJsonSchema(schema, '{"v":true}')
    expect(res.branchGroups[0]?.schemaPath).toBe('#/properties/v/anyOf')
    expect(res.branchGroups[0]?.path).toBe('/v')
  })

  it('gives no branch group when the data is valid', () => {
    const res = validateJsonSchema(schema, '{"v":"text"}')
    expect(res.branchGroups).toEqual([])
  })

  it('groups a failed oneOf', () => {
    const oneOfSchema = JSON.stringify({
      oneOf: [{ type: 'string' }, { type: 'boolean' }],
    })
    const res = validateJsonSchema(oneOfSchema, '42')
    expect(res.branchGroups[0]?.keyword).toBe('oneOf')
    expect(res.branchGroups[0]?.branches).toHaveLength(2)
  })
})

describe('schema test cases', () => {
  const schema = JSON.stringify({
    type: 'object',
    properties: { id: { type: 'integer' } },
    required: ['id'],
  })

  it('parses a list of test cases', () => {
    const { cases, error } = parseTestCases('[{"name":"ok","data":{"id":1}}]')
    expect(error).toBeUndefined()
    expect(cases).toEqual([{ name: 'ok', data: { id: 1 }, expectValid: true }])
  })

  it('names a case that has no name', () => {
    const { cases } = parseTestCases('[{"data":{"id":1}}]')
    expect(cases[0]?.name).toBe('Case 1')
  })

  it('rejects test cases that are not an array', () => {
    expect(parseTestCases('{"data":1}').error).toContain('must be a JSON array')
  })

  it('rejects a case with no data field', () => {
    expect(parseTestCases('[{"name":"x"}]').error).toContain('needs a "data" field')
  })

  it('reports pass for a payload that matches', () => {
    const { cases } = parseTestCases('[{"name":"good","data":{"id":1}}]')
    const results = runSchemaTestCases(schema, cases)
    expect(results[0]?.passed).toBe(true)
    expect(results[0]?.isValid).toBe(true)
  })

  it('reports fail for a payload that does not match', () => {
    const { cases } = parseTestCases('[{"name":"bad","data":{}}]')
    const results = runSchemaTestCases(schema, cases)
    expect(results[0]?.passed).toBe(false)
    expect(results[0]?.errorCount).toBeGreaterThan(0)
    expect(results[0]?.firstError).toBeTruthy()
  })

  it('passes when an invalid payload is expected to fail', () => {
    const { cases } = parseTestCases('[{"name":"must fail","data":{},"expectValid":false}]')
    const results = runSchemaTestCases(schema, cases)
    expect(results[0]?.passed).toBe(true)
    expect(results[0]?.isValid).toBe(false)
  })

  it('runs every case in the list', () => {
    const { cases } = parseTestCases('[{"data":{"id":1}},{"data":{}},{"data":{"id":2}}]')
    const results = runSchemaTestCases(schema, cases)
    expect(results.map(r => r.passed)).toEqual([true, false, true])
  })
})
