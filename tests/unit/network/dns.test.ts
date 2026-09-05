import { describe, expect, it } from 'vitest'
import { formatDnsRecord } from '../../../shared/utils/network/dns'

describe('formatDnsRecord', () => {
  it('returns string records as is', () => {
    expect(formatDnsRecord('93.184.216.34')).toBe('93.184.216.34')
  })

  it('formats MX record objects with priority and exchange', () => {
    expect(formatDnsRecord({ priority: 10, exchange: 'mail.example.com' })).toBe('10 mail.example.com')
  })

  it('stringifies other objects', () => {
    expect(formatDnsRecord({ flags: 0, tag: 'issue', value: 'letsencrypt.org' }))
      .toBe('{"flags":0,"tag":"issue","value":"letsencrypt.org"}')
  })
})
