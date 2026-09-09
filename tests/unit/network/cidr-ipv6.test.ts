import { describe, expect, it } from 'vitest'
import { analyzeCidr, cidrContainsIp, compareCidr } from '#shared/utils/network/cidr'
import { compressIpv6, expandIpv6, ipv6ToBigInt, parseCidrV6 } from '#shared/utils/network/cidr-ipv6'

describe('parseCidrV6', () => {
  it('calculates a /64 subnet', () => {
    const res = parseCidrV6('2001:db8:abcd:12::1/64')
    expect(res.version).toBe(6)
    expect(res.prefix).toBe(64)
    expect(res.networkAddress).toBe('2001:db8:abcd:12::')
    expect(res.lastAddress).toBe('2001:db8:abcd:12:ffff:ffff:ffff:ffff')
    expect(res.networkAddressFull).toBe('2001:0db8:abcd:0012:0000:0000:0000:0000')
    expect(res.totalAddresses).toBe('18446744073709551616')
  })

  it('calculates a /48 subnet', () => {
    const res = parseCidrV6('2001:db8::/48')
    expect(res.networkAddress).toBe('2001:db8::')
    expect(res.networkAddressFull).toBe('2001:0db8:0000:0000:0000:0000:0000:0000')
    expect(res.lastAddress).toBe('2001:db8:0:ffff:ffff:ffff:ffff:ffff')
    expect(res.totalAddresses).toBe('1208925819614629174706176')
  })

  it('calculates a /128 single address', () => {
    const res = parseCidrV6('::1/128')
    expect(res.prefix).toBe(128)
    expect(res.networkAddress).toBe('::1')
    expect(res.lastAddress).toBe('::1')
    expect(res.totalAddresses).toBe('1')
    expect(res.isLoopback).toBe(true)
    expect(res.scope).toBe('loopback')
  })

  it('uses /128 when the input has no prefix', () => {
    expect(parseCidrV6('2001:db8::5').prefix).toBe(128)
  })

  it('never writes the address count in scientific notation', () => {
    expect(parseCidrV6('::/0').totalAddresses).toBe('340282366920938463463374607431768211456')
    expect(parseCidrV6('2001:db8::/32').totalAddresses).not.toMatch(/e/i)
  })

  it('classifies a unique local address', () => {
    const res = parseCidrV6('fd12:3456:789a:1::1/64')
    expect(res.networkAddress).toBe('fd12:3456:789a:1::')
    expect(res.isPrivate).toBe(true)
    expect(res.scope).toBe('private')
  })

  it('throws on an invalid address or prefix', () => {
    expect(() => parseCidrV6('2001:db8::/129')).toThrow()
    expect(() => parseCidrV6('2001:db8::/64abc')).toThrow()
    expect(() => parseCidrV6('2001:db8:::1/64')).toThrow()
    expect(() => parseCidrV6('2001:zzzz::/64')).toThrow()
    expect(() => parseCidrV6('/64')).toThrow()
  })
})

describe('ipv6 address text', () => {
  it('expands and compresses an address', () => {
    const value = ipv6ToBigInt('2001:db8::1')
    expect(expandIpv6(value)).toBe('2001:0db8:0000:0000:0000:0000:0000:0001')
    expect(compressIpv6(value)).toBe('2001:db8::1')
  })

  it('keeps one zero group in the long form', () => {
    expect(compressIpv6(ipv6ToBigInt('2001:db8:0:1:1:1:1:1'))).toBe('2001:db8:0:1:1:1:1:1')
  })

  it('compresses the longest run of zero groups', () => {
    expect(compressIpv6(ipv6ToBigInt('2001:0:0:1:0:0:0:1'))).toBe('2001:0:0:1::1')
    expect(compressIpv6(0n)).toBe('::')
  })

  it('reads an address with an IPv4 tail', () => {
    expect(compressIpv6(ipv6ToBigInt('::ffff:192.0.2.128'))).toBe('::ffff:c000:280')
  })
})

describe('ipv6 subnet checks', () => {
  it('tests one address against a block', () => {
    expect(cidrContainsIp('2001:db8::/32', '2001:db8:1234::9')).toBe(true)
    expect(cidrContainsIp('2001:db8::/32', '2001:db9::1')).toBe(false)
  })

  it('rejects a mix of IP versions', () => {
    expect(() => cidrContainsIp('2001:db8::/32', '192.168.1.1')).toThrow()
    expect(() => compareCidr('2001:db8::/32', '192.168.1.0/24')).toThrow()
  })

  it('compares two blocks', () => {
    expect(compareCidr('2001:db8::/32', '2001:db8:1::/48').relation).toBe('contains')
    expect(compareCidr('2001:db8::/48', '2001:db8::/48').sharedAddresses).toBe('1208925819614629174706176')
    expect(compareCidr('2001:db8::/32', '2001:db9::/32').overlaps).toBe(false)
  })
})

describe('analyzeCidr', () => {
  it('reads both address families', () => {
    expect(analyzeCidr('192.168.1.0/24').version).toBe(4)
    expect(analyzeCidr('2001:db8::/64').version).toBe(6)
  })
})
