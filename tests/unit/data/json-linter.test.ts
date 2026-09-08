import { describe, expect, it } from 'vitest'
import { getJsonErrorPosition } from '#shared/utils/data/errors'
import { jsonParseLinter } from '#shared/utils/data/json-linter'

describe('json-linter', () => {
  describe('getJsonErrorPosition', () => {
    it('returns null for valid JSON', () => {
      expect(getJsonErrorPosition('{"valid": true, "count": 10}')).toBeNull()
    })

    it('computes exact line and column for trailing comma without browser error matching', () => {
      const input = '{\n  "a": 1,\n}'
      const pos = getJsonErrorPosition(input)
      expect(pos).not.toBeNull()
      expect(pos?.line).toBe(3)
      expect(pos?.column).toBe(1)
    })

    it('computes exact line and column for missing comma', () => {
      const input = '{\n  "a": 1\n  "b": 2\n}'
      const pos = getJsonErrorPosition(input)
      expect(pos).not.toBeNull()
      expect(pos?.line).toBe(3)
    })

    it('computes exact position for invalid identifier value', () => {
      const input = '{"key": undefined}'
      const pos = getJsonErrorPosition(input)
      expect(pos).not.toBeNull()
      expect(pos?.line).toBe(1)
      expect(pos?.column).toBe(9)
    })
  })

  describe('jsonParseLinter', () => {
    it('returns no diagnostics for valid JSON', () => {
      const linterFn = jsonParseLinter()
      const doc = {
        toString: () => '{"name": "KitDev"}',
        length: 18,
      }
      const diagnostics = linterFn({ state: { doc } })
      expect(diagnostics).toHaveLength(0)
    })

    it('returns no diagnostics for empty input', () => {
      const linterFn = jsonParseLinter()
      const doc = {
        toString: () => '   ',
        length: 3,
      }
      const diagnostics = linterFn({ state: { doc } })
      expect(diagnostics).toHaveLength(0)
    })

    it('returns error diagnostic with line and column for invalid JSON', () => {
      const linterFn = jsonParseLinter()
      const invalidJson = '{\n  "a": 1,\n}'
      const doc = {
        toString: () => invalidJson,
        length: invalidJson.length,
      }
      const diagnostics = linterFn({ state: { doc } })
      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0]?.severity).toBe('error')
      expect(diagnostics[0]?.message).toContain('Line 3, column 1')
      expect(diagnostics[0]?.from).toBeGreaterThan(0)
    })
  })
})
