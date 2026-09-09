import type { CodecFormat } from '#shared/utils/dev/codec'
import { describe, expect, it } from 'vitest'
import {
  buildDataUrl,
  CODEC_OPTIONS,
  CodecError,
  decodeBinaryBase64,
  decodeWith,
  encodeWith,
  extensionForMime,
  parseDataUrl,
} from '#shared/utils/dev/codec'

/** Runs the decoder and returns the CodecError that it throws. */
function codecError(text: string, format: CodecFormat): CodecError {
  try {
    decodeWith(text, format)
  }
  catch (cause) {
    if (cause instanceof CodecError) {
      return cause
    }
    throw cause
  }
  throw new Error('The decoder did not report an error.')
}

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

describe('url scope', () => {
  it('keeps the URL separators in full mode and encodes them in component mode', () => {
    const url = 'https://example.com/a b?q=1&r=2#top'
    expect(encodeWith(url, 'url', { urlScope: 'full' }))
      .toBe('https://example.com/a%20b?q=1&r=2#top')
    expect(encodeWith(url, 'url', { urlScope: 'component' }))
      .toBe('https%3A%2F%2Fexample.com%2Fa%20b%3Fq%3D1%26r%3D2%23top')
  })

  it('returns the input after a full mode round trip', () => {
    const url = 'https://example.com/path?q=café 😀&r=/a/b#end'
    const encoded = encodeWith(url, 'url', { urlScope: 'full' })
    expect(decodeWith(encoded, 'url', { urlScope: 'full' })).toBe(url)
  })

  it('encodes for a component by default', () => {
    expect(encodeWith('a/b', 'url')).toBe('a%2Fb')
  })
})

describe('error offsets', () => {
  it('reports the offset of an illegal Base64 character', () => {
    const error = codecError('aGVsbG8=!', 'base64')
    expect(error.offset).toBe(8)
    expect(error.character).toBe('!')
    expect(error.message).toBe('Invalid Base64 character "!" at offset 8.')
  })

  it('counts the offset from the raw input, including leading whitespace', () => {
    const error = codecError('\n  aGVs*bG8=', 'base64')
    expect(error.offset).toBe(7)
    expect(error.character).toBe('*')
  })

  it('accepts the standard alphabet in the URL-safe format', () => {
    expect(() => decodeWith('a+/=', 'base64url')).not.toThrow()
    expect(codecError('aGVs bG8_!', 'base64url').offset).toBe(9)
  })

  it('reports the offset of a percent escape without two hex digits', () => {
    const error = codecError('name=caf%e9&x=%zz', 'url')
    expect(error.offset).toBe(14)
    expect(error.character).toBe('%')
    expect(error.message).toBe('Invalid percent escape "%zz" at offset 14.')
  })

  it('reports the offset of a percent sign at the end of the input', () => {
    expect(codecError('abc%', 'url').offset).toBe(3)
  })

  it('reports the offset of an escape that is half of a UTF-8 character', () => {
    const error = codecError('a=1&b=%C3', 'url')
    expect(error.offset).toBe(6)
    expect(error.message).toContain('%C3')
  })
})

describe('binary Base64', () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47])

  it('builds a data URL with the MIME type', () => {
    expect(buildDataUrl('image/png', bytes)).toBe('data:image/png;base64,iVBORw==')
    expect(buildDataUrl('', bytes)).toBe('data:application/octet-stream;base64,iVBORw==')
  })

  it('parses a data URL and rejects other text', () => {
    expect(parseDataUrl('data:image/png;base64,iVBORw==')).toEqual({
      mime: 'image/png',
      data: 'iVBORw==',
    })
    expect(parseDataUrl('iVBORw==')).toBeNull()
    expect(parseDataUrl('data:text/plain,hello')).toBeNull()
  })

  it('derives a file extension from the MIME type', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/svg+xml')).toBe('svg')
    expect(extensionForMime('application/pdf')).toBe('pdf')
    expect(extensionForMime('application/octet-stream')).toBe('bin')
  })

  it('decodes a data URL and a plain payload to the same bytes', () => {
    const fromDataUrl = decodeBinaryBase64(buildDataUrl('image/png', bytes))
    expect(fromDataUrl.bytes).toEqual(bytes)
    expect(fromDataUrl.mime).toBe('image/png')
    expect(fromDataUrl.extension).toBe('png')

    const fromPayload = decodeBinaryBase64('iVBORw==')
    expect(fromPayload.bytes).toEqual(bytes)
    expect(fromPayload.mime).toBe('application/octet-stream')
    expect(fromPayload.extension).toBe('bin')
  })

  it('reports the offset of a bad character inside a data URL payload', () => {
    let error: CodecError | null = null
    try {
      decodeBinaryBase64('data:image/png;base64,iVBO!w==')
    }
    catch (cause) {
      error = cause as CodecError
    }
    expect(error?.offset).toBe(26)
    expect(error?.character).toBe('!')
  })
})
