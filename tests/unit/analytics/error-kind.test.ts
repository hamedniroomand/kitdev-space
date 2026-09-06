import { describe, expect, it } from 'vitest'
import { errorKind } from '#shared/utils/analytics/error-kind'
import { DataError } from '#shared/utils/data/errors'

describe('errorKind', () => {
  it('reads http status codes', () => {
    expect(errorKind({ statusCode: 400 })).toBe('validation')
    expect(errorKind({ status: 422 })).toBe('validation')
    expect(errorKind({ response: { status: 503 } })).toBe('server')
    expect(errorKind({ statusCode: 404 })).toBe('unknown')
  })

  it('reads error names and never the message', () => {
    expect(errorKind(new DataError('Invalid JSON near "secret"'))).toBe('validation')
    expect(errorKind(new SyntaxError('x'))).toBe('validation')
    expect(errorKind(Object.assign(new Error('boom'), { name: 'FetchError' }))).toBe('network')
    expect(errorKind(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe('network')
    expect(errorKind(Object.assign(new Error('x'), { name: 'NotSupportedError' }))).toBe('unsupported')
    expect(errorKind(new TypeError('Failed to fetch'))).toBe('network')
    expect(errorKind(new Error('anything at all'))).toBe('unknown')
    expect(errorKind(null)).toBe('unknown')
    expect(errorKind('text')).toBe('unknown')
  })
})
