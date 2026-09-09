import { describe, expect, it } from 'vitest'
import {
  base64ByteLength,
  formatAsCssBackground,
  formatAsHtmlImg,
  IMAGE_BASE64_MAX_BYTES,
  mimeToExtension,
  parseDataUri,
  validateImageBase64,
} from '#shared/utils/image/base64'

describe('parseDataUri', () => {
  it('parses valid data uri with mime type', () => {
    const uri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    const res = parseDataUri(uri)
    expect(res.isDataUri).toBe(true)
    expect(res.mimeType).toBe('image/svg+xml')
    expect(res.base64).toBe('PHN2Zz48L3N2Zz4=')
  })

  it('parses data uri with parameters like charset', () => {
    const uri = 'data:image/svg+xml;charset=utf-8;base64,PHN2Zz48L3N2Zz4='
    const res = parseDataUri(uri)
    expect(res.isDataUri).toBe(true)
    expect(res.mimeType).toBe('image/svg+xml')
    expect(res.base64).toBe('PHN2Zz48L3N2Zz4=')
  })

  it('handles raw base64 string', () => {
    const raw = 'aGVsbG8='
    const res = parseDataUri(raw)
    expect(res.isDataUri).toBe(false)
    expect(res.mimeType).toBe('image/png')
    expect(res.base64).toBe('aGVsbG8=')
  })

  it('maps mime types to correct file extensions', () => {
    expect(mimeToExtension('image/svg+xml')).toBe('svg')
    expect(mimeToExtension('image/jpeg')).toBe('jpg')
    expect(mimeToExtension('image/webp')).toBe('webp')
    expect(mimeToExtension('image/png')).toBe('png')
  })
})

describe('base64ByteLength', () => {
  it('counts decoded bytes with padding', () => {
    expect(base64ByteLength('aGVsbG8=')).toBe(5)
    expect(base64ByteLength('PHN2Zz48L3N2Zz4=')).toBe(11)
    expect(base64ByteLength('')).toBe(0)
  })
})

describe('validateImageBase64', () => {
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('accepts a valid data uri', () => {
    expect(validateImageBase64(onePixelPng)).toBeNull()
  })

  it('accepts a raw base64 string', () => {
    expect(validateImageBase64('PHN2Zz48L3N2Zz4=')).toBeNull()
  })

  it('rejects an empty input', () => {
    expect(validateImageBase64('   ')).toMatch(/Add a Base64 string/)
  })

  it('rejects data outside the base64 alphabet', () => {
    expect(validateImageBase64('not base64!')).toMatch(/not valid Base64/)
  })

  it('rejects data over the 10 MB limit', () => {
    const oversize = 'A'.repeat(Math.ceil((IMAGE_BASE64_MAX_BYTES + 1024) / 3) * 4)
    expect(validateImageBase64(oversize)).toMatch(/larger than 10 MB/)
  })
})

describe('formatters', () => {
  it('formats html img tag', () => {
    const res = formatAsHtmlImg('data:image/png;base64,abc', 'Test')
    expect(res).toBe('<img src="data:image/png;base64,abc" alt="Test" />')
  })

  it('formats css background-image', () => {
    const res = formatAsCssBackground('data:image/png;base64,abc')
    expect(res).toBe('background-image: url(\'data:image/png;base64,abc\');')
  })
})
