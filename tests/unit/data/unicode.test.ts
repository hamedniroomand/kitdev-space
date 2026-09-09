import { describe, expect, it } from 'vitest'
import {
  detectSecurityChars,
  getEscapeFormats,
  groupGraphemes,
  inspectUnicode,
  removeInvisibleChars,
} from '#shared/utils/data/unicode'

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

describe('groupGraphemes', () => {
  it('returns an empty array for empty input', () => {
    expect(groupGraphemes('')).toEqual([])
  })

  it('groups a family emoji ZWJ sequence as one grapheme', () => {
    // 👨‍👩‍👧 = man + ZWJ + woman + ZWJ + girl
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'
    const clusters = groupGraphemes(family)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].isMultiCodePoint).toBe(true)
    expect(clusters[0].codePoints.length).toBeGreaterThan(1)
  })

  it('groups an ASCII string as one grapheme per character', () => {
    const clusters = groupGraphemes('abc')
    expect(clusters).toHaveLength(3)
    expect(clusters.every(c => !c.isMultiCodePoint)).toBe(true)
  })

  it('treats a flag emoji as one grapheme with 2 code points', () => {
    // 🇺🇸 = two regional indicator symbols
    const flag = '\u{1F1FA}\u{1F1F8}'
    const clusters = groupGraphemes(flag)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].codePoints).toHaveLength(2)
  })
})

describe('detectSecurityChars', () => {
  it('flags a bidirectional override character', () => {
    const text = `hello\u202Eworld`
    const diags = detectSecurityChars(text)
    expect(diags.some(d => d.kind === 'bidi')).toBe(true)
  })

  it('flags a zero-width space as invisible', () => {
    const text = `a\u200Bb`
    const diags = detectSecurityChars(text)
    expect(diags.some(d => d.kind === 'invisible')).toBe(true)
  })

  it('flags mixed Latin and Cyrillic as mixed-script', () => {
    // Latin 'a' + Cyrillic 'а' (looks identical)
    const text = `hello\u0430world` // \u0430 is Cyrillic 'a'
    const diags = detectSecurityChars(text)
    expect(diags.some(d => d.kind === 'mixed-script')).toBe(true)
  })

  it('returns no diagnostics for clean ASCII text', () => {
    const diags = detectSecurityChars('Hello World')
    expect(diags).toHaveLength(0)
  })

  it('does not prevent copying — only returns diagnostic info', () => {
    const text = `\u202Ehidden`
    const diags = detectSecurityChars(text)
    expect(diags.length).toBeGreaterThan(0)
    // Caller still has the original text unchanged
    expect(text).toContain('\u202E')
  })
})

describe('removeInvisibleChars', () => {
  it('removes zero-width spaces while keeping visible text', () => {
    const text = 'a\u200Bb'
    expect(removeInvisibleChars(text)).toBe('ab')
  })

  it('removes BOM from the start of a string', () => {
    const text = '\uFEFFHello'
    expect(removeInvisibleChars(text)).toBe('Hello')
  })

  it('does not modify the original string', () => {
    const text = 'a\u200Bb'
    removeInvisibleChars(text)
    expect(text).toBe('a\u200Bb')
  })

  it('leaves clean ASCII text unchanged', () => {
    expect(removeInvisibleChars('Hello World')).toBe('Hello World')
  })
})

describe('getEscapeFormats', () => {
  it('returns correct escapes for a BMP character', () => {
    const formats = getEscapeFormats('A')
    expect(formats.jsUnicode).toBe('\\u0041')
    expect(formats.jsCodePoint).toBe('\\u{41}')
    expect(formats.htmlEntity).toBe('&#x41;')
    expect(formats.css).toBe('\\0041')
    expect(formats.python).toBe('\\u0041')
    expect(formats.url).toBe('A')
  })

  it('returns surrogate pair for emoji in jsUnicode', () => {
    const formats = getEscapeFormats('🚀') // U+1F680
    expect(formats.jsUnicode).toContain('\\uD83D')
    expect(formats.jsCodePoint).toBe('\\u{1f680}')
    expect(formats.htmlEntity).toBe('&#x1F680;')
  })

  it('returns url-encoded form for non-ASCII', () => {
    const formats = getEscapeFormats('é')
    expect(formats.url).toBe('%C3%A9')
  })
})
