import { describe, expect, it } from 'vitest'
import { analyzeIp } from '../../../shared/utils/network/ip-info'

describe('analyzeIp', () => {
  it('analyzes standard public IPv4 address', () => {
    const res = analyzeIp('8.8.8.8')
    expect(res.version).toBe(4)
    expect(res.type).toBe('public')
    expect(res.isSpecial).toBe(false)
    expect(res.decimal).toBe('134744072')
    expect(res.hex).toBe('0x08080808')
  })

  it('detects private IPv4 addresses', () => {
    const res = analyzeIp('192.168.1.1')
    expect(res.type).toBe('private')
    expect(res.isSpecial).toBe(true)
  })

  it('detects loopback IPv4 and IPv6', () => {
    expect(analyzeIp('127.0.0.1').type).toBe('loopback')
    expect(analyzeIp('::1').type).toBe('loopback')
    expect(analyzeIp('::1').version).toBe(6)
  })

  it('throws on invalid IP formats', () => {
    expect(() => analyzeIp('not-an-ip')).toThrow()
    expect(() => analyzeIp('256.0.0.1')).toThrow()
  })
})
