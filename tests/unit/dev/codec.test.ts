import type { CodecFormat } from '#shared/utils/dev/codec'
import { describe, expect, it } from 'vitest'
import { CODEC_OPTIONS, decodeWith, encodeWith } from '#shared/utils/dev/codec'

const SAMPLE = 'Hello, "world" & <friends>\n\ttab \'quote\' café 😀'

describe('encodeWith and decodeWith', () => {
  it('returns the input after a round trip for every format', () => {
    for (const option of CODEC_OPTIONS) {
      const encoded = encodeWith(SAMPLE, option.value)
      expect(decodeWith(encoded, option.value), option.value).toBe(SAMPLE)
    }
  })

  it('writes the known Base64 form', () => {
    expect(encodeWith('hello', 'base64')).toBe('aGVsbG8=')
    expect(decodeWith('aGVsbG8=', 'base64')).toBe('hello')
  })

  it('writes URL-safe Base64 with no padding', () => {
    const encoded = encodeWith('a?b>c~d', 'base64url')
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(decodeWith(encoded, 'base64url')).toBe('a?b>c~d')
  })

  it('writes the known hex form', () => {
    expect(encodeWith('AB', 'hex')).toBe('4142')
    expect(decodeWith('4142', 'hex')).toBe('AB')
  })

  it('percent encodes a query value', () => {
    expect(encodeWith('a b&c', 'url')).toBe('a%20b%26c')
  })

  it('makes text safe inside HTML', () => {
    expect(encodeWith('<b>&</b>', 'html')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
  })

  it('escapes for a SQL string', () => {
    expect(encodeWith('O\'Brien', 'sql')).toBe('O\'\'Brien')
  })

  it('quotes a shell argument', () => {
    expect(encodeWith('rm -rf /', 'shell')).toBe('\'rm -rf /\'')
  })

  it('handles UTF-8 beyond the ASCII range', () => {
    for (const format of ['base64', 'base64url', 'hex', 'url'] as CodecFormat[]) {
      expect(decodeWith(encodeWith('café 😀', format), format)).toBe('café 😀')
    }
  })

  it('reports a bad Base64 input', () => {
    expect(() => decodeWith('not base64!!', 'base64')).toThrow(/Invalid Base64/)
  })

  it('reports a bad hex input', () => {
    expect(() => decodeWith('xyz', 'hex')).toThrow(/Invalid hex/)
  })
})
