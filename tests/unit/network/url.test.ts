import { describe, expect, it } from 'vitest'
import {
  buildQueryString,
  buildUrlWithParams,
  encodeQueryPart,
  inspectUrl,
  maskUrlCredentials,
  maskUrlParts,
  parseQueryParams,
} from '#shared/utils/network/url'

describe('inspectUrl', () => {
  it('parses URL parts', () => {
    expect(inspectUrl('https://user:pass@example.com:8443/path?q=1&x=2#top')).toEqual({
      href: 'https://user:pass@example.com:8443/path?q=1&x=2#top',
      protocol: 'https:',
      username: 'user',
      password: 'pass',
      host: 'example.com:8443',
      hostname: 'example.com',
      port: '8443',
      pathname: '/path',
      pathnameDecoded: '/path',
      search: '?q=1&x=2',
      params: [
        { key: 'q', value: '1', rawKey: 'q', rawValue: '1', bare: false },
        { key: 'x', value: '2', rawKey: 'x', rawValue: '2', bare: false },
      ],
      hash: '#top',
    })
  })

  it('keeps a plus sign in the path and reads a plus sign as a space in the query', () => {
    const parts = inspectUrl('https://example.com/a+b?q=a+b')
    expect(parts.pathnameDecoded).toBe('/a+b')
    expect(parts.params[0]?.value).toBe('a b')
  })

  it('accepts an incomplete escape', () => {
    const parts = inspectUrl('https://example.com/?a=100%')
    expect(parts.params[0]).toEqual({ key: 'a', value: '100%', rawKey: 'a', rawValue: '100%', bare: false })
  })

  it('rejects empty input', () => {
    expect(() => inspectUrl('')).toThrow('Enter a URL.')
    expect(() => inspectUrl('   ')).toThrow('Enter a URL.')
  })

  it('rejects invalid URL', () => {
    expect(() => inspectUrl('not a url')).toThrow('Enter a valid URL.')
  })
})

describe('parseQueryParams', () => {
  it('keeps duplicate keys as separate rows', () => {
    expect(parseQueryParams('?a=1&a=2').map(param => param.value)).toEqual(['1', '2'])
  })

  it('reads a key with no value', () => {
    expect(parseQueryParams('?flag')).toEqual([
      { key: 'flag', value: '', rawKey: 'flag', rawValue: '', bare: true },
    ])
  })

  it('decodes the raw text', () => {
    expect(parseQueryParams('?q=a%20b&e=%E2%9C%93').map(param => param.value)).toEqual(['a b', '✓'])
  })

  it('returns no row for an empty query', () => {
    expect(parseQueryParams('')).toEqual([])
    expect(parseQueryParams('?')).toEqual([])
  })
})

describe('buildQueryString', () => {
  const samples = ['?a=1&a=2', '?q=a+b', '?q=a%20b', '?e=%E2%9C%93', '?flag', '?x=', '?a=100%']

  it.each(samples)('rebuilds %s without a change', (search) => {
    expect(buildQueryString(parseQueryParams(search))).toBe(search.slice(1))
  })

  it('encodes an edited value one time', () => {
    const params = parseQueryParams('?q=a%20b')
    params[0]!.value = '100% new'
    params[0]!.rawValue = encodeQueryPart(params[0]!.value)
    expect(buildQueryString(params)).toBe('q=100%25%20new')
  })
})

describe('buildUrlWithParams', () => {
  it('rebuilds the full URL', () => {
    expect(buildUrlWithParams('https://example.com/p?a=1', parseQueryParams('?a=1&b=2')))
      .toBe('https://example.com/p?a=1&b=2')
  })

  it('removes the question mark when no parameter is left', () => {
    expect(buildUrlWithParams('https://example.com/p?a=1', [])).toBe('https://example.com/p')
  })
})

describe('maskUrlCredentials', () => {
  it('masks the user name and the password', () => {
    expect(maskUrlCredentials('https://user:pass@example.com/?u=user:pass@example.com'))
      .toBe('https://***:***@example.com/?u=user:pass@example.com')
  })

  it('masks a user name with no password', () => {
    expect(maskUrlCredentials('https://user@example.com/')).toBe('https://***@example.com/')
  })

  it('keeps a URL with no credentials', () => {
    expect(maskUrlCredentials('https://example.com/path')).toBe('https://example.com/path')
  })
})

describe('maskUrlParts', () => {
  it('masks the credential fields and the href', () => {
    const masked = maskUrlParts(inspectUrl('https://user:s3cr3t@example.com/path'))
    expect(masked.username).toBe('***')
    expect(masked.password).toBe('***')
    expect(masked.href).toBe('https://***:***@example.com/path')
    expect(JSON.stringify(masked)).not.toContain('s3cr3t')
  })

  it('keeps parts with no credentials', () => {
    const parts = inspectUrl('https://example.com/path')
    expect(maskUrlParts(parts)).toBe(parts)
  })
})
