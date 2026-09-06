import { describe, expect, it, spyOn } from 'bun:test'
import { inspectEmailHealth } from '../../../server/utils/network/email-health'
import * as dns from '../../../server/utils/network/dns'

describe('inspectEmailHealth', () => {
  it('looks up SPF, MX, and DKIM selector records', async () => {
    const lookupDns = spyOn(dns, 'lookupDns').mockImplementation(async (domain, type) => {
      if (type === 'TXT' && domain === 'example.com') {
        return ['v=spf1 include:_spf.google.com -all']
      }
      if (type === 'MX' && domain === 'example.com') {
        return [{ priority: 10, exchange: 'mail.example.com' }]
      }
      if (type === 'TXT' && domain === 'google._domainkey.example.com') {
        return ['v=DKIM1; k=rsa; p=abc']
      }
      return []
    })

    try {
      const result = await inspectEmailHealth('EXAMPLE.COM.', ['google', 'default'])
      expect(result.domain).toBe('example.com')
      expect(result.spf.present).toBe(true)
      expect(result.mx.records[0]?.exchange).toBe('mail.example.com')
      expect(result.dkim.selectors.find(item => item.selector === 'google')?.present).toBe(true)
      expect(result.dkim.selectors.find(item => item.selector === 'default')?.present).toBe(false)
      expect(lookupDns).toHaveBeenCalled()
    } finally {
      lookupDns.mockRestore()
    }
  })
})
