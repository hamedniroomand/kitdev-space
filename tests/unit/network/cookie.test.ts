import { describe, expect, it } from 'vitest'
import { inspectCookies, parseCookieHeader, parseSetCookie } from '#shared/utils/network/cookie'

const NOW = Date.parse('2026-09-07T00:00:00Z')

describe('parseSetCookie', () => {
  it('reads the value and every attribute', () => {
    const cookie = parseSetCookie('sid=abc123; Domain=example.com; Path=/; Expires=Wed, 09 Sep 2026 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict; Priority=High', NOW)
    expect(cookie.name).toBe('sid')
    expect(cookie.value).toBe('abc123')
    expect(cookie.domain).toBe('example.com')
    expect(cookie.path).toBe('/')
    expect(cookie.expires).toBe('2026-09-09T00:00:00.000Z')
    expect(cookie.lifetimeSeconds).toBe(2 * 24 * 60 * 60)
    expect(cookie.secure).toBe(true)
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('Strict')
    expect(cookie.priority).toBe('High')
    expect(cookie.session).toBe(false)
    expect(cookie.findings).toEqual([])
  })

  it('flags a cookie with no Secure, no HttpOnly, and no SameSite', () => {
    const cookie = parseSetCookie('token=1', NOW)
    const messages = cookie.findings.map(f => f.message)
    expect(cookie.session).toBe(true)
    expect(messages.some(m => m.startsWith('No SameSite'))).toBe(true)
    expect(messages.some(m => m.startsWith('No Secure'))).toBe(true)
    expect(messages.some(m => m.startsWith('No HttpOnly'))).toBe(true)
  })

  it('rejects SameSite=None without Secure', () => {
    const cookie = parseSetCookie('a=1; SameSite=None', NOW)
    expect(cookie.findings.some(f => f.level === 'error' && f.message.startsWith('SameSite=None needs Secure'))).toBe(true)
  })

  it('lets Max-Age win over Expires and caps the lifetime warning at 400 days', () => {
    const cookie = parseSetCookie('a=1; Expires=Wed, 09 Sep 2026 00:00:00 GMT; Max-Age=40000000; Secure; HttpOnly; SameSite=Lax', NOW)
    expect(cookie.maxAge).toBe(40000000)
    expect(cookie.lifetimeSeconds).toBe(40000000)
    expect(cookie.findings.some(f => f.message.includes('400 days'))).toBe(true)
  })

  it('checks the __Host- and __Secure- prefixes', () => {
    expect(parseSetCookie('__Host-id=1; Secure; Path=/; HttpOnly; SameSite=Lax', NOW).findings).toEqual([])
    expect(parseSetCookie('__Host-id=1; Secure; Path=/; Domain=example.com; HttpOnly; SameSite=Lax', NOW).findings.some(f => f.level === 'error')).toBe(true)
    expect(parseSetCookie('__Secure-id=1; HttpOnly; SameSite=Lax', NOW).findings.some(f => f.message.startsWith('A __Secure- cookie'))).toBe(true)
  })

  it('reports an invalid Expires date and an oversized value', () => {
    const invalid = parseSetCookie('a=1; Expires=tomorrow', NOW)
    expect(invalid.expires).toBeNull()
    expect(invalid.session).toBe(true)
    const big = parseSetCookie(`a=${'x'.repeat(4100)}`, NOW)
    expect(big.findings.some(f => f.level === 'error' && f.message.includes('4096'))).toBe(true)
  })
})

describe('parseCookieHeader', () => {
  it('splits the pairs of a request header', () => {
    expect(parseCookieHeader('a=1; b=two; empty=')).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: 'two' },
      { name: 'empty', value: '' }
    ])
  })
})

describe('inspectCookies', () => {
  it('reads one header per line and detects the kind', () => {
    const report = inspectCookies([
      'Set-Cookie: sid=1; Secure; HttpOnly; SameSite=Lax',
      'cookie: a=1; b=2',
      'plain=value; Path=/',
      'x=1; y=2; z=3',
      ''
    ].join('\n'), NOW)
    expect(report.setCookies.map(c => c.name)).toEqual(['sid', 'plain'])
    expect(report.requestCookies.map(c => c.name)).toEqual(['a', 'b', 'x', 'y', 'z'])
  })
})
