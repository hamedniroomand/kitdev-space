import { describe, expect, it } from 'vitest'
import { inspectUnicode } from '#shared/utils/data/unicode'

describe('inspectUnicode', () => {
  it('inspects simple ASCII string', () => {
    const res = inspectUnicode('Hi')
    expect(res.totalChars).toBe(2)
    expect(res.totalCodePoints).toBe(2)
    expect(res.chars[0]).toMatchObject({
      char: 'H',
      codePoint: 72,
      hex: 'U+0048',
      category: 'Basic Latin (ASCII)',
    })
    expect(res.hasZeroWidth).toBe(false)
  })

  it('handles emoji with surrogate pairs', () => {
    const res = inspectUnicode('🚀')
    expect(res.totalChars).toBe(2) // UTF-16 length
    expect(res.totalCodePoints).toBe(1) // 1 Unicode code point
    expect(res.chars[0]?.hex).toBe('U+1F680')
    expect(res.chars[0]?.category).toBe('Emoji & Symbols')
    expect(res.chars[0]?.utf8Bytes).toEqual(['F0', '9F', '9A', '80'])
  })

  it('detects zero-width characters', () => {
    const res = inspectUnicode('A\u200BB')
    expect(res.hasZeroWidth).toBe(true)
    expect(res.chars[1]?.isZeroWidth).toBe(true)
    expect(res.chars[1]?.displayChar).toBe('[Zero-Width]')
  })

  it('provides normalization forms', () => {
    const accented = 'e\u0301' // 'e' with combining acute accent (NFD)
    const res = inspectUnicode(accented)
    expect(res.normalization.isNfd).toBe(true)
    expect(res.normalization.isNfc).toBe(false)
    expect(res.normalization.nfc).toBe('é')
  })
})
