import { describe, expect, it } from 'vitest'
import { DataError } from '#shared/utils/data/errors'
import {
  detectJsonWarnings,
  formatJson,
  minifyJson,
  parseJson,
  validateJson,
} from '#shared/utils/data/json'

describe('json core', () => {
  it('formats json with 2-space indent', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('minifies json', () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}')
  })

  it('validates good json', () => {
    expect(validateJson('{"a":1}')).toEqual({ ok: true })
  })

  it('returns a clear error for bad json', () => {
    const result = validateJson('{"a":')
    expect(result.ok).toBe(false)
    if (result.ok)
      return
    expect(result.error).toBeInstanceOf(DataError)
    expect(result.error.message).not.toMatch(/Unexpected token/)
    expect(result.error.message.length).toBeGreaterThan(0)
  })

  it('parseJson throws DataError', () => {
    expect(() => parseJson('{')).toThrow(DataError)
  })

  it('reports error position in strict JSON for JSONC with leading comments', () => {
    const jsonc = '// leading comment\n{\n  "valid": 1,\n  "broken": \n}'
    try {
      parseJson(jsonc)
      expect.unreachable()
    }
    catch (err) {
      expect(err).toBeInstanceOf(DataError)
      const dataErr = err as DataError
      expect(dataErr.line !== undefined || dataErr.position !== undefined).toBe(true)
    }
  })

  describe('detectJsonWarnings', () => {
    it('warns when an integer exceeds 2^53 - 1', () => {
      const warnings = detectJsonWarnings('{"id": 9007199254740993}')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]?.type).toBe('precision')
      expect(warnings[0]?.message).toContain('9007199254740993')
    })

    it('warns when a negative integer exceeds -(2^53 - 1)', () => {
      const warnings = detectJsonWarnings('{"id": -9007199254740993}')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]?.type).toBe('precision')
      expect(warnings[0]?.message).toContain('-9007199254740993')
    })

    it('does not warn for safe integers', () => {
      const warnings = detectJsonWarnings('{"max": 9007199254740991, "min": -9007199254740991, "zero": 0, "pi": 3.14159}')
      expect(warnings).toHaveLength(0)
    })

    it('warns on duplicate keys in the same object', () => {
      const warnings = detectJsonWarnings('{"a": 1, "b": 2, "a": 3}')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]?.type).toBe('duplicate_key')
      expect(warnings[0]?.message).toContain('"a"')
    })

    it('warns on duplicate keys in nested objects', () => {
      const warnings = detectJsonWarnings('{"nested": {"x": 1, "x": 2}}')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]?.type).toBe('duplicate_key')
      expect(warnings[0]?.message).toContain('"x"')
    })

    it('does not warn when same key exists in different objects or scopes', () => {
      const warnings = detectJsonWarnings('{"a": {"x": 1}, "b": {"x": 2}, "x": 3}')
      expect(warnings).toHaveLength(0)
    })

    it('warns on unquoted duplicate keys in JSON5', () => {
      const warnings = detectJsonWarnings('{ foo: 1, bar: 2, foo: 3 }')
      expect(warnings).toHaveLength(1)
      expect(warnings[0]?.type).toBe('duplicate_key')
      expect(warnings[0]?.message).toContain('"foo"')
    })
  })
})
