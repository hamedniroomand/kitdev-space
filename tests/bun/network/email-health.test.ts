import { describe, expect, it, spyOn } from 'bun:test'
import * as dns from '#server/utils/network/dns'
import { inspectEmailHealth } from '#server/utils/network/email-health'

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
      if (type === 'TXT' && domain === '_dmarc.example.com') {
        return ['v=DMARC1; p=reject; rua=mailto:reports@example.com']
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
      expect(result.dmarc.present).toBe(true)
      expect(result.dmarc.policy).toBe('reject')
      expect(lookupDns).toHaveBeenCalled()
    }
    finally {
      lookupDns.mockRestore()
    }
  })

  it('keeps the report when the _dmarc lookup fails', async () => {
    const lookupDns = spyOn(dns, 'lookupDns').mockImplementation(async (domain, type) => {
      if (domain.startsWith('_dmarc.')) {
        throw new Error('The lookup failed.')
      }
      if (type === 'TXT' && domain === 'example.com') {
        return ['v=spf1 -all']
      }
      if (type === 'MX' && domain === 'example.com') {
        return [{ priority: 10, exchange: 'mail.example.com' }]
      }
      return []
    })

    try {
      const result = await inspectEmailHealth('example.com', ['google'])
      expect(result.spf.present).toBe(true)
      expect(result.mx.records).toHaveLength(1)
      expect(result.dmarc.present).toBe(false)
    }
    finally {
      lookupDns.mockRestore()
    }
  })

  it('reports a failed resolver apart from a missing record', async () => {
    const lookupDns = spyOn(dns, 'lookupDns').mockImplementation(async (domain, type) => {
      if (type === 'TXT' && domain === 'example.com') {
        throw new Error('The lookup failed.')
      }
      if (type === 'MX' && domain === 'example.com') {
        return [{ priority: 10, exchange: 'mail.example.com' }]
      }
      return []
    })

    try {
      const result = await inspectEmailHealth('example.com', ['google'])
      expect(result.spf.lookup).toBe('failed')
      expect(result.spf.issues.map(item => item.code)).toEqual(['spf-lookup-failed'])
      // A resolver error must not mark the domain invalid.
      expect(result.spf.issues[0]?.level).toBe('warning')
      expect(result.dmarc.lookup).toBe('ok')
      expect(result.dmarc.issues[0]?.code).toBe('dmarc-missing')
      expect(result.mx.lookup).toBe('ok')
    }
    finally {
      lookupDns.mockRestore()
    }
  })

  it('checks MTA-STS, TLS-RPT, and BIMI and scores the domain', async () => {
    const lookupDns = spyOn(dns, 'lookupDns').mockImplementation(async (domain, type) => {
      if (type !== 'TXT' && type !== 'MX') {
        return []
      }
      if (type === 'MX') {
        return domain === 'example.com' ? [{ priority: 10, exchange: 'mail.example.com' }] : []
      }
      const txt: Record<string, string[]> = {
        'example.com': ['v=spf1 ip4:203.0.113.0/24 -all'],
        '_dmarc.example.com': ['v=DMARC1; p=reject; rua=mailto:r@example.com'],
        '_mta-sts.example.com': ['v=STSv1; id=20240101'],
        '_smtp._tls.example.com': ['v=TLSRPTv1; rua=mailto:tls@example.com'],
        'default._bimi.example.com': ['v=BIMI1; l=https://example.com/logo.svg'],
      }
      return txt[domain] ?? []
    })

    try {
      const result = await inspectEmailHealth('example.com', ['default'])
      expect(result.mtaSts?.name).toBe('_mta-sts.example.com')
      expect(result.mtaSts?.present).toBe(true)
      expect(result.tlsRpt?.name).toBe('_smtp._tls.example.com')
      expect(result.tlsRpt?.present).toBe(true)
      expect(result.bimi?.name).toBe('default._bimi.example.com')
      expect(result.bimi?.present).toBe(true)
      expect(result.spf.trace?.ipv4).toEqual(['203.0.113.0/24'])
      expect(result.score?.max).toBe(100)
      expect(result.score?.lines.length).toBeGreaterThan(5)
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.score!.grade)
    }
    finally {
      lookupDns.mockRestore()
    }
  })
})
