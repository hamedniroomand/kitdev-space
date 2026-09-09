import { describe, expect, it } from 'vitest'
import { cidrContainsIp, compareCidr, parseCidr } from '#shared/utils/network/cidr'

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

describe('cidrContainsIp', () => {
  it('accepts an address inside the block', () => {
    expect(cidrContainsIp('192.168.1.0/24', '192.168.1.200')).toBe(true)
    expect(cidrContainsIp('10.0.0.0/8', '10.255.255.255')).toBe(true)
  })

  it('rejects an address outside the block', () => {
    expect(cidrContainsIp('192.168.1.0/24', '192.168.2.1')).toBe(false)
    expect(cidrContainsIp('10.0.0.0/8', '11.0.0.1')).toBe(false)
  })

  it('accepts the network and the broadcast address', () => {
    expect(cidrContainsIp('192.168.1.0/24', '192.168.1.0')).toBe(true)
    expect(cidrContainsIp('192.168.1.0/24', '192.168.1.255')).toBe(true)
  })

  it('handles a host route and a full range', () => {
    expect(cidrContainsIp('8.8.8.8/32', '8.8.8.8')).toBe(true)
    expect(cidrContainsIp('8.8.8.8/32', '8.8.8.9')).toBe(false)
    expect(cidrContainsIp('0.0.0.0/0', '203.0.113.9')).toBe(true)
  })

  it('throws on an invalid address', () => {
    expect(() => cidrContainsIp('192.168.1.0/24', '999.1.1.1')).toThrow()
    expect(() => cidrContainsIp('192.168.1.0/24', '')).toThrow()
  })
})

describe('compareCidr', () => {
  it('detects two identical blocks', () => {
    const res = compareCidr('192.168.1.0/24', '192.168.1.0/24')
    expect(res.relation).toBe('equal')
    expect(res.overlaps).toBe(true)
    expect(res.sharedAddresses).toBe('256')
  })

  it('detects a block that encloses the second block', () => {
    const res = compareCidr('10.0.0.0/8', '10.1.2.0/24')
    expect(res.relation).toBe('contains')
    expect(res.overlaps).toBe(true)
    expect(res.sharedAddresses).toBe('256')
  })

  it('detects a block inside the second block', () => {
    const res = compareCidr('172.16.5.0/24', '172.16.0.0/16')
    expect(res.relation).toBe('within')
    expect(res.overlaps).toBe(true)
    expect(res.sharedAddresses).toBe('256')
  })

  it('detects two blocks that do not overlap', () => {
    const res = compareCidr('192.168.1.0/24', '192.168.2.0/24')
    expect(res.relation).toBe('disjoint')
    expect(res.overlaps).toBe(false)
    expect(res.sharedAddresses).toBe('0')
  })

  it('normalizes a host bit before the comparison', () => {
    const res = compareCidr('192.168.1.77/24', '192.168.1.0/26')
    expect(res.relation).toBe('contains')
    expect(res.sharedAddresses).toBe('64')
  })
})
