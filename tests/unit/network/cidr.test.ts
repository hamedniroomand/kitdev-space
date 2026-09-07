import { describe, expect, it } from 'vitest'
import { parseCidr } from '#shared/utils/network/cidr'

describe('parseCidr', () => {
  it('calculates standard /24 subnet correctly', () => {
    const res = parseCidr('192.168.1.50/24')
    expect(res.netmask).toBe('255.255.255.0')
    expect(res.wildcard).toBe('0.0.0.255')
    expect(res.networkAddress).toBe('192.168.1.0')
    expect(res.broadcastAddress).toBe('192.168.1.255')
    expect(res.firstUsableIp).toBe('192.168.1.1')
    expect(res.lastUsableIp).toBe('192.168.1.254')
    expect(res.usableHosts).toBe(254)
    expect(res.totalHosts).toBe(256)
    expect(res.isPrivate).toBe(true)
    expect(res.ipClass).toBe('C')
  })

  it('calculates /16 network correctly', () => {
    const res = parseCidr('10.0.10.5/16')
    expect(res.netmask).toBe('255.255.0.0')
    expect(res.networkAddress).toBe('10.0.0.0')
    expect(res.broadcastAddress).toBe('10.0.255.255')
    expect(res.usableHosts).toBe(65534)
    expect(res.isPrivate).toBe(true)
    expect(res.ipClass).toBe('A')
  })

  it('handles /32 host route', () => {
    const res = parseCidr('8.8.8.8/32')
    expect(res.netmask).toBe('255.255.255.255')
    expect(res.networkAddress).toBe('8.8.8.8')
    expect(res.broadcastAddress).toBe('8.8.8.8')
    expect(res.usableHosts).toBe(1)
    expect(res.isPrivate).toBe(false)
  })

  it('handles /31 point-to-point link', () => {
    const res = parseCidr('172.16.0.0/31')
    expect(res.usableHosts).toBe(2)
    expect(res.firstUsableIp).toBe('172.16.0.0')
    expect(res.lastUsableIp).toBe('172.16.0.1')
  })

  it('throws on invalid IP or prefix', () => {
    expect(() => parseCidr('999.1.1.1/24')).toThrow()
    expect(() => parseCidr('192.168.1.1/35')).toThrow()
    expect(() => parseCidr('192.168.1.1abc/24')).toThrow()
    expect(() => parseCidr('01.1.1.1/24')).toThrow()
  })

  it('detects Link-Local addresses correctly', () => {
    const res = parseCidr('169.254.1.1/16')
    expect(res.isLinkLocal).toBe(true)
    expect(res.isPrivate).toBe(false)
  })
})
