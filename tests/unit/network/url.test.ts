import { describe, expect, it } from 'vitest'
import { inspectUrl } from '#shared/utils/network/url'

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
      search: '?q=1&x=2',
      searchParams: { q: '1', x: '2' },
      hash: '#top'
    })
  })

  it('rejects empty input', () => {
    expect(() => inspectUrl('')).toThrow('Enter a URL.')
    expect(() => inspectUrl('   ')).toThrow('Enter a URL.')
  })

  it('rejects invalid URL', () => {
    expect(() => inspectUrl('not a url')).toThrow('Enter a valid URL.')
  })
})
