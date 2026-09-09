import { describe, expect, it } from 'vitest'
import { findJsonPointerOffset, parseJsonPointer } from '#shared/utils/data/json-pointer'

describe('parseJsonPointer', () => {
  it('splits a pointer into segments', () => {
    expect(parseJsonPointer('#/a/b')).toEqual(['a', 'b'])
  })

  it('returns no segment for a root pointer', () => {
    expect(parseJsonPointer('#')).toEqual([])
    expect(parseJsonPointer('#/')).toEqual([])
  })

  it('decodes the escape sequences of a segment', () => {
    expect(parseJsonPointer('#/a~1b/c~0d')).toEqual(['a/b', 'c~d'])
  })

  it('keeps an array index as a segment', () => {
    expect(parseJsonPointer('#/items/0/name')).toEqual(['items', '0', 'name'])
  })
})

describe('findJsonPointerOffset', () => {
  const text = `{
  "id": 1,
  "user": {
    "name": "Ada",
    "tags": ["a", "b"]
  }
}`

  it('finds a top-level key', () => {
    const offset = findJsonPointerOffset(text, '#/id')
    expect(offset).toBe(text.indexOf('"id"'))
  })

  it('finds a nested key', () => {
    const offset = findJsonPointerOffset(text, '#/user/name')
    expect(offset).toBe(text.indexOf('"name"'))
  })

  it('finds a key after a nested object', () => {
    const offset = findJsonPointerOffset(text, '#/user/tags')
    expect(offset).toBe(text.indexOf('"tags"'))
  })

  it('finds an array item by index', () => {
    const offset = findJsonPointerOffset(text, '#/user/tags/1')
    expect(offset).toBe(text.indexOf('"b"'))
  })

  it('returns the root offset for a root pointer', () => {
    expect(findJsonPointerOffset(text, '#')).toBe(0)
  })

  it('returns null for a key that is absent', () => {
    expect(findJsonPointerOffset(text, '#/missing')).toBeNull()
  })

  it('returns null for an array index that is out of range', () => {
    expect(findJsonPointerOffset(text, '#/user/tags/9')).toBeNull()
  })

  it('does not confuse a key with the same name at another level', () => {
    const nested = `{
  "outer": { "name": "inner" },
  "name": "outer-value"
}`
    const offset = findJsonPointerOffset(nested, '#/name')
    expect(offset).toBe(nested.lastIndexOf('"name"'))
  })

  it('skips a string that holds a brace', () => {
    const tricky = `{
  "a": "value with { brace",
  "b": 2
}`
    expect(findJsonPointerOffset(tricky, '#/b')).toBe(tricky.indexOf('"b"'))
  })

  it('skips a key that holds an escaped quote', () => {
    const tricky = `{
  "a\\"x": 1,
  "b": 2
}`
    expect(findJsonPointerOffset(tricky, '#/b')).toBe(tricky.indexOf('"b"'))
  })

  it('finds a schema keyword path', () => {
    const schema = `{
  "type": "object",
  "properties": {
    "v": {
      "anyOf": [
        { "type": "string" },
        { "type": "number" }
      ]
    }
  }
}`
    const offset = findJsonPointerOffset(schema, '#/properties/v/anyOf/1/type')
    expect(offset).toBe(schema.lastIndexOf('"type"'))
  })
})
