import { describe, expect, it } from 'vitest'
import { stableStringify } from '#shared/utils/data/stable-json'

describe('stableStringify', () => {
  it('gives the same text for the same content in a different key order', () => {
    const a = stableStringify({ b: 1, a: { d: [1, { z: 1, y: 2 }], c: 2 } })
    const b = stableStringify({ a: { c: 2, d: [1, { y: 2, z: 1 }] }, b: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":{"c":2,"d":[1,{"y":2,"z":1}]},"b":1}')
  })

  it('keeps the order of an array', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]')
  })

  it('supports an indent', () => {
    expect(stableStringify({ a: 1 }, 2)).toBe('{\n  "a": 1\n}')
  })
})
