import { describe, expect, it } from 'vitest'
import { convertFromBase } from '#shared/utils/data/number-base'

describe('number Base Converter', () => {
  it('converts decimal 255 across all bases', () => {
    const res = convertFromBase('255', 10)
    expect(res.decimal).toBe('255')
    expect(res.binary).toBe('11111111')
    expect(res.octal).toBe('377')
    expect(res.hex).toBe('FF')
  })

  it('converts hex with prefix', () => {
    const res = convertFromBase('0x1A', 16)
    expect(res.decimal).toBe('26')
    expect(res.binary).toBe('11010')
  })

  it('converts negative hex numbers such as -ff', () => {
    const res = convertFromBase('-ff', 16)
    expect(res.decimal).toBe('-255')
    expect(res.hex).toBe('-FF')
  })

  it('supports large BigInt numbers', () => {
    const large = '9007199254740993'
    const res = convertFromBase(large, 10)
    expect(res.decimal).toBe(large)
    expect(res.hex).toBe('20000000000001')
  })

  it('throws on invalid characters', () => {
    expect(() => convertFromBase('102', 2)).toThrow()
    expect(() => convertFromBase('89', 8)).toThrow()
    expect(() => convertFromBase('1G', 16)).toThrow()
  })
})
