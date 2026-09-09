import { describe, expect, it } from 'vitest'
import { evaluateCookieDelivery, inspectCookies, parseCookieHeader, parseSetCookie, redactCookieReport, REDACTED_VALUE } from '#shared/utils/network/cookie'

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
      { name: 'empty', value: '' },
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
      '',
    ].join('\n'), NOW)
    expect(report.setCookies.map(c => c.name)).toEqual(['sid', 'plain'])
    expect(report.requestCookies.map(c => c.name)).toEqual(['a', 'b', 'x', 'y', 'z'])
  })
})

describe('evaluateCookieDelivery', () => {
  const secure = (line: string) => parseSetCookie(line, NOW)

  it('sends a cookie that matches the domain, the path, and the scheme', () => {
    const cookie = secure('sid=1; Domain=example.com; Path=/app; Secure; HttpOnly; SameSite=Lax')
    const result = evaluateCookieDelivery(cookie, 'https://api.example.com/app/users', 'same-site')
    expect(result.sent).toBe(true)
    expect(result.blocks).toEqual([])
  })

  it('reports a domain mismatch and a path mismatch', () => {
    const cookie = secure('sid=1; Domain=example.com; Path=/app; Secure; HttpOnly; SameSite=Lax')
    const result = evaluateCookieDelivery(cookie, 'https://example.org/other', 'same-site')
    expect(result.sent).toBe(false)
    expect(result.blocks.some(block => block.startsWith('Domain mismatch'))).toBe(true)
    expect(result.blocks.some(block => block.startsWith('Path mismatch'))).toBe(true)
  })

  it('matches a path at a segment boundary only', () => {
    const cookie = secure('sid=1; Path=/app; Secure; HttpOnly; SameSite=Lax')
    expect(evaluateCookieDelivery(cookie, 'https://example.com/application', 'same-site').sent).toBe(false)
    expect(evaluateCookieDelivery(cookie, 'https://example.com/app', 'same-site').sent).toBe(true)
  })

  it('blocks a Secure cookie over HTTP, but not on localhost', () => {
    const cookie = secure('sid=1; Path=/; Secure; HttpOnly; SameSite=Lax')
    const overHttp = evaluateCookieDelivery(cookie, 'http://example.com/', 'same-site')
    expect(overHttp.sent).toBe(false)
    expect(overHttp.blocks.some(block => block.startsWith('Secure over HTTP'))).toBe(true)
    expect(evaluateCookieDelivery(cookie, 'http://localhost:3000/', 'same-site').sent).toBe(true)
  })

  it('applies the SameSite rules for each request context', () => {
    const strict = secure('sid=1; Path=/; Secure; HttpOnly; SameSite=Strict')
    const lax = secure('sid=1; Path=/; Secure; HttpOnly; SameSite=Lax')
    const none = secure('sid=1; Path=/; Secure; HttpOnly; SameSite=None')
    const url = 'https://example.com/'
    expect(evaluateCookieDelivery(strict, url, 'cross-site-navigation').sent).toBe(false)
    expect(evaluateCookieDelivery(lax, url, 'cross-site-navigation').sent).toBe(true)
    expect(evaluateCookieDelivery(lax, url, 'cross-site').sent).toBe(false)
    expect(evaluateCookieDelivery(lax, url, 'cross-site').blocks[0]).toContain('SameSite=Lax')
    expect(evaluateCookieDelivery(none, url, 'cross-site').sent).toBe(true)
    expect(evaluateCookieDelivery(strict, url, 'same-site').sent).toBe(true)
  })

  it('treats a missing SameSite attribute as Lax', () => {
    const cookie = secure('sid=1; Path=/; Secure; HttpOnly')
    const result = evaluateCookieDelivery(cookie, 'https://example.com/', 'cross-site')
    expect(result.sent).toBe(false)
    expect(result.blocks[0]).toContain('No SameSite attribute')
  })

  it('blocks a rejected cookie and a deleted cookie', () => {
    const rejected = secure('a=1; SameSite=None')
    expect(evaluateCookieDelivery(rejected, 'https://example.com/', 'same-site').blocks).toEqual([
      'The browser rejects this cookie. Correct the errors below first.',
    ])
    const deleted = secure('a=1; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax')
    const result = evaluateCookieDelivery(deleted, 'https://example.com/', 'same-site')
    expect(result.sent).toBe(false)
    expect(result.blocks[0]).toContain('deletes the cookie')
  })

  it('notes a host-only cookie and rejects an invalid URL', () => {
    const cookie = secure('sid=1; Path=/; Secure; HttpOnly; SameSite=Lax')
    expect(evaluateCookieDelivery(cookie, 'https://example.com/', 'same-site').notes[0]).toContain('Host only')
    expect(evaluateCookieDelivery(cookie, 'example.com', 'same-site').sent).toBe(false)
    expect(evaluateCookieDelivery(cookie, 'ftp://example.com/', 'same-site').sent).toBe(false)
  })
})

describe('redactCookieReport', () => {
  it('masks every value and keeps the size', () => {
    const report = inspectCookies('Set-Cookie: sid=secret; Path=/\nCookie: a=1; b=2', NOW)
    const masked = redactCookieReport(report)
    expect(masked.setCookies[0]!.value).toBe(REDACTED_VALUE)
    expect(masked.setCookies[0]!.size).toBe(report.setCookies[0]!.size)
    expect(masked.requestCookies.map(cookie => cookie.value)).toEqual([REDACTED_VALUE, REDACTED_VALUE])
    expect(JSON.stringify(masked)).not.toContain('secret')
  })
})
