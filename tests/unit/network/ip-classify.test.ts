import { describe, expect, it } from 'vitest'
import { classifyIp } from '#shared/utils/network/ip-classify'

describe('classifyIp', () => {
  it('classifies public IPv4 addresses', () => {
    const res = classifyIp('8.8.8.8')
    expect(res.version).toBe(4)
    expect(res.type).toBe('public')
    expect(res.isPrivate).toBe(false)
    expect(res.isLoopback).toBe(false)
    expect(res.isSpecial).toBe(false)
  })

  it('classifies private IPv4 addresses (10.x, 172.16.x, 192.168.x)', () => {
    expect(classifyIp('10.0.0.1').type).toBe('private')
    expect(classifyIp('172.16.0.1').type).toBe('private')
    expect(classifyIp('172.31.255.255').type).toBe('private')
    expect(classifyIp('192.168.1.1').type).toBe('private')
    expect(classifyIp('10.0.0.1').isPrivate).toBe(true)
  })

  it('classifies loopback IPv4 addresses', () => {
    const res = classifyIp('127.0.0.1')
    expect(res.type).toBe('loopback')
    expect(res.isLoopback).toBe(true)
    expect(res.isSpecial).toBe(true)
  })

  it('classifies link-local IPv4 addresses', () => {
    const res = classifyIp('169.254.169.254')
    expect(res.type).toBe('link-local')
    expect(res.isLinkLocal).toBe(true)
  })

  it('classifies multicast and reserved IPv4 addresses', () => {
    expect(classifyIp('224.0.0.1').type).toBe('multicast')
    expect(classifyIp('239.255.255.250').type).toBe('multicast')
    expect(classifyIp('240.0.0.1').type).toBe('reserved')
    expect(classifyIp('0.0.0.0').type).toBe('reserved')
  })

  it('classifies IPv6 loopback and link-local', () => {
    expect(classifyIp('::1').type).toBe('loopback')
    expect(classifyIp('::1').isLoopback).toBe(true)
    expect(classifyIp('fe80::1').type).toBe('link-local')
    expect(classifyIp('fe80::1').isLinkLocal).toBe(true)
  })

  it('classifies IPv6 private (unique local)', () => {
    expect(classifyIp('fc00::1').type).toBe('private')
    expect(classifyIp('fd12:3456:789a::1').type).toBe('private')
  })

  it('classifies IPv6 multicast and public', () => {
    expect(classifyIp('ff02::1').type).toBe('multicast')
    expect(classifyIp('2001:4860:4860::8888').type).toBe('public')
  })

  it('rejects invalid IP addresses', () => {
    expect(() => classifyIp('')).toThrow()
    expect(() => classifyIp('999.999.999.999')).toThrow()
    expect(() => classifyIp('invalid')).toThrow()
  })

  it('reports the matched IPv4 range and the RFC', () => {
    expect(classifyIp('10.1.2.3')).toMatchObject({ matchedRange: '10.0.0.0/8', rfc: 'RFC 1918' })
    expect(classifyIp('172.20.0.1')).toMatchObject({ matchedRange: '172.16.0.0/12', rfc: 'RFC 1918' })
    expect(classifyIp('192.168.1.1')).toMatchObject({ matchedRange: '192.168.0.0/16', rfc: 'RFC 1918' })
    expect(classifyIp('100.100.0.1')).toMatchObject({ matchedRange: '100.64.0.0/10', rfc: 'RFC 6598' })
    expect(classifyIp('169.254.169.254')).toMatchObject({ matchedRange: '169.254.0.0/16', rfc: 'RFC 3927' })
    expect(classifyIp('127.0.0.1')).toMatchObject({ matchedRange: '127.0.0.0/8', rfc: 'RFC 1122' })
    expect(classifyIp('224.0.0.1')).toMatchObject({ matchedRange: '224.0.0.0/4', rfc: 'RFC 5771' })
  })

  it('reports the matched IPv6 range and the RFC', () => {
    expect(classifyIp('::1')).toMatchObject({ matchedRange: '::1/128', rfc: 'RFC 4291' })
    expect(classifyIp('fe80::1')).toMatchObject({ matchedRange: 'fe80::/10', rfc: 'RFC 4291' })
    expect(classifyIp('fd12:3456:789a::1')).toMatchObject({ matchedRange: 'fc00::/7', rfc: 'RFC 4193' })
    expect(classifyIp('ff02::1')).toMatchObject({ matchedRange: 'ff00::/8', rfc: 'RFC 4291' })
    expect(classifyIp('2001:db8::1')).toMatchObject({ matchedRange: '2001:db8::/32', rfc: 'RFC 3849' })
  })

  it('takes the range of the mapped IPv4 address for ::ffff: addresses', () => {
    expect(classifyIp('::ffff:a00:1')).toMatchObject({
      type: 'private',
      matchedRange: '10.0.0.0/8',
      rfc: 'RFC 1918',
    })
    expect(classifyIp('::ffff:808:808')).toMatchObject({
      type: 'public',
      matchedRange: '::ffff:0:0/96',
      rfc: 'RFC 4291',
    })
  })

  it('reports no range for a public address', () => {
    const res = classifyIp('8.8.8.8')
    expect(res.matchedRange).toBeUndefined()
    expect(res.rfc).toBeUndefined()
  })
})
