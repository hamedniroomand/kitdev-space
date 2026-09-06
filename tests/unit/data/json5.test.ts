import { describe, expect, it } from 'vitest'
import { looksLikeJson5, toStrictJson } from '#shared/utils/data/json5'

function round(input: string) {
  return JSON.parse(toStrictJson(input))
}

describe('toStrictJson', () => {
  it('leaves strict JSON unchanged', () => {
    const strict = '{"a":1,"b":[1,2],"c":"x"}'
    expect(toStrictJson(strict)).toBe(strict)
    expect(looksLikeJson5(strict)).toBe(false)
  })

  it('removes a line comment', () => {
    expect(round('{ // note\n "a": 1 }')).toEqual({ a: 1 })
  })

  it('removes a block comment', () => {
    expect(round('{ /* note\n more */ "a": 1 }')).toEqual({ a: 1 })
  })

  it('removes a trailing comma in an object and an array', () => {
    expect(round('{ "a": 1, }')).toEqual({ a: 1 })
    expect(round('[1, 2, ]')).toEqual([1, 2])
    expect(round('{ "a": [1,], }')).toEqual({ a: [1] })
  })

  it('removes a trailing comma that a comment follows', () => {
    expect(round('{ "a": 1, // last\n }')).toEqual({ a: 1 })
  })

  it('quotes an unquoted key', () => {
    expect(round('{ name: "kit", $ref: 1, _x: 2 }')).toEqual({ name: 'kit', $ref: 1, _x: 2 })
  })

  it('converts a single-quoted string', () => {
    expect(round('{ \'a\': \'hi\' }')).toEqual({ a: 'hi' })
  })

  it('keeps true, false, and null as values', () => {
    expect(round('{ a: true, b: false, c: null }')).toEqual({ a: true, b: false, c: null })
  })

  it('never changes the content of a string', () => {
    expect(round('{ "url": "https://x.dev//path", "note": "a, b," }'))
      .toEqual({ url: 'https://x.dev//path', note: 'a, b,' })
    expect(round('{ "c": "/* not a comment */" }')).toEqual({ c: '/* not a comment */' })
    expect(round('{ "k": "key: value" }')).toEqual({ k: 'key: value' })
  })

  it('escapes a double quote inside a single-quoted string', () => {
    expect(round('{ \'say\': \'he said "hi"\' }')).toEqual({ say: 'he said "hi"' })
  })

  it('keeps an escape sequence', () => {
    expect(round('{ "a": "line\\nbreak\\ttab" }')).toEqual({ a: 'line\nbreak\ttab' })
    expect(round('{ \'a\': \'it\\\'s\' }')).toEqual({ a: 'it\'s' })
  })

  it('handles a real config file', () => {
    const config = `{
      // the server block
      host: 'localhost',
      port: 3000,
      /* a list of hosts */
      allowed: [
        'a.dev',
        'b.dev',
      ],
      debug: false,
    }`
    expect(round(config)).toEqual({
      host: 'localhost',
      port: 3000,
      allowed: ['a.dev', 'b.dev'],
      debug: false
    })
  })

  it('reports that a JSON5 input is not strict', () => {
    expect(looksLikeJson5('{ a: 1 }')).toBe(true)
    expect(looksLikeJson5('{ "a": 1, }')).toBe(true)
  })
})
