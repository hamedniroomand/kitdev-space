import { describe, expect, it } from 'vitest'
import { checkHostMatch, parseSans, parseSubject } from '../../../server/utils/network/tls'

describe('tls utilities', () => {
  it('parses subject information', () => {
    const rawSubject = {
      CN: 'example.com',
      O: 'Example Corp',
      OU: 'IT Dept',
      C: 'US',
      ST: 'California',
      L: 'San Francisco'
    }

    const parsed = parseSubject(rawSubject as unknown as Record<string, string>)
    expect(parsed.commonName).toBe('example.com')
    expect(parsed.organization).toBe('Example Corp')
    expect(parsed.country).toBe('US')
  })

  it('parses SANs string', () => {
    const sansStr = 'DNS:example.com, DNS:*.example.com, DNS:api.example.org'
    const sans = parseSans(sansStr)
    expect(sans).toEqual(['example.com', '*.example.com', 'api.example.org'])
  })

  it('checks host matches against SANs and wildcards', () => {
    const sans = ['example.com', '*.example.com', 'sub.domain.org']

    expect(checkHostMatch('example.com', sans)).toBe(true)
    expect(checkHostMatch('api.example.com', sans)).toBe(true)
    expect(checkHostMatch('nested.api.example.com', sans)).toBe(false)
    expect(checkHostMatch('other.com', sans)).toBe(false)
    expect(checkHostMatch('sub.domain.org', sans)).toBe(true)
  })

  it('falls back to Common Name if SANs is empty', () => {
    expect(checkHostMatch('myhost.local', [], 'myhost.local')).toBe(true)
    expect(checkHostMatch('diff.local', [], 'myhost.local')).toBe(false)
  })
})
