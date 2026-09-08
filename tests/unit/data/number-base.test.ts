import { describe, expect, it } from 'vitest'
import { convertFromBase, groupDigits, twosComplement, validateDigits } from '#shared/utils/data/number-base'

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

describe('validateDigits', () => {
  it('marks all chars valid for a correct binary string', () => {
    const result = validateDigits('1010', 2)
    expect(result).toEqual([true, true, true, true])
  })

  it('marks an invalid digit false for the given base', () => {
    const result = validateDigits('102', 2)
    expect(result[2]).toBe(false)
  })

  it('marks invalid hex char G as false', () => {
    const result = validateDigits('1G', 16)
    expect(result[1]).toBe(false)
  })

  it('allows a leading minus sign in any base', () => {
    const result = validateDigits('-FF', 16)
    expect(result[0]).toBe(true) // minus
    expect(result[1]).toBe(true) // F
    expect(result[2]).toBe(true) // F
  })

  it('marks a valid decimal string as all true', () => {
    const result = validateDigits('12345', 10)
    expect(result.every(v => v)).toBe(true)
  })
})

describe('groupDigits', () => {
  it('groups binary by 4', () => {
    expect(groupDigits('11111111', 2)).toBe('1111_1111')
  })

  it('groups decimal by 3', () => {
    expect(groupDigits('1000000', 10)).toBe('1_000_000')
  })

  it('groups hex by 2', () => {
    expect(groupDigits('DEADBEEF', 16)).toBe('DE_AD_BE_EF')
  })

  it('preserves negative sign', () => {
    expect(groupDigits('-255', 10)).toBe('-255')
    expect(groupDigits('-1000000', 10)).toBe('-1_000_000')
  })

  it('accepts a custom separator', () => {
    expect(groupDigits('11111111', 2, ' ')).toBe('1111 1111')
  })
})

describe('twosComplement', () => {
  it('returns FF for -1 in 8-bit mode', () => {
    expect(twosComplement('-1', 8)).toBe('FF')
  })

  it('returns 00 for 0 in 8-bit mode', () => {
    expect(twosComplement('0', 8)).toBe('00')
  })

  it('returns 7F for 127 (max positive 8-bit)', () => {
    expect(twosComplement('127', 8)).toBe('7F')
  })

  it('returns 80 for -128 (min negative 8-bit)', () => {
    expect(twosComplement('-128', 8)).toBe('80')
  })

  it('returns null for 128 which is out of range for 8-bit signed', () => {
    expect(twosComplement('128', 8)).toBeNull()
  })

  it('returns null for -129 which is out of range for 8-bit signed', () => {
    expect(twosComplement('-129', 8)).toBeNull()
  })

  it('handles 16-bit boundary values', () => {
    expect(twosComplement('32767', 16)).toBe('7FFF')
    expect(twosComplement('-32768', 16)).toBe('8000')
  })

  it('handles 32-bit negative one', () => {
    expect(twosComplement('-1', 32)).toBe('FFFFFFFF')
  })

  it('handles 64-bit negative one', () => {
    expect(twosComplement('-1', 64)).toBe('FFFFFFFFFFFFFFFF')
  })

  it('returns null for non-numeric input', () => {
    expect(twosComplement('abc', 8)).toBeNull()
  })
})
