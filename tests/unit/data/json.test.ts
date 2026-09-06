import { describe, expect, it } from 'vitest'
import {
  formatJson,
  minifyJson,
  parseJson,
  validateJson
} from '#shared/utils/data/json'
import { DataError } from '#shared/utils/data/errors'

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
    if (result.ok) return
    expect(result.error).toBeInstanceOf(DataError)
    expect(result.error.message).not.toMatch(/Unexpected token/)
    expect(result.error.message.length).toBeGreaterThan(0)
  })

  it('parseJson throws DataError', () => {
    expect(() => parseJson('{')).toThrow(DataError)
  })
})
