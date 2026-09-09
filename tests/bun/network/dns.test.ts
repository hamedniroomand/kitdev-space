import { describe, expect, it, spyOn } from 'bun:test'
import { lookupAllDns, lookupDns } from '#server/utils/network/dns'

type BunDnsResolvers = typeof Bun.dns & {
  resolve: (hostname: string, rrtype?: string) => Promise<unknown>
  resolveCname: (hostname: string) => Promise<string[]>
  resolveMx: (hostname: string) => Promise<{ priority: number, exchange: string }[]>
  resolveNs: (hostname: string) => Promise<string[]>
  resolveSoa: (hostname: string) => Promise<Record<string, unknown>>
  resolveTxt: (hostname: string) => Promise<string[][]>
  resolveCaa: (hostname: string) => Promise<Record<string, unknown>[]>
}

const bunDns = Bun.dns as BunDnsResolvers

describe('lookupDns', () => {
  it('rejects an empty domain', async () => {
    await expect(lookupDns('', 'A')).rejects.toThrow('Enter a domain.')
  })

  it('rejects a domain with spaces', async () => {
    await expect(lookupDns('example .com', 'A')).rejects.toThrow('Enter a valid domain.')
  })

  it('rejects a URL', async () => {
    await expect(lookupDns('https://example.com', 'A')).rejects.toThrow('Enter a domain, not a URL.')
  })

  it('rejects a domain that is too long', async () => {
    const domain = `${'a'.repeat(250)}.com`
    await expect(lookupDns(domain, 'A')).rejects.toThrow('The domain is too long.')
  })

  it('looks up A records', async () => {
    const resolve = spyOn(bunDns, 'resolve').mockResolvedValue([
      { address: '93.184.216.34', ttl: 60 },
    ])

    try {
      const result = await lookupDns('example.com', 'A')
      expect(result).toEqual(['93.184.216.34'])
      expect(resolve).toHaveBeenCalledWith('example.com', 'A')
    }
    finally {
      resolve.mockRestore()
    }
  })

  it('looks up AAAA records', async () => {
    const resolve = spyOn(bunDns, 'resolve').mockResolvedValue([
      { address: '2606:2800:220:1:248:1893:25c8:1946', ttl: 60 },
    ])

    try {
      const result = await lookupDns('EXAMPLE.COM.', 'AAAA')
      expect(result).toEqual(['2606:2800:220:1:248:1893:25c8:1946'])
      expect(resolve).toHaveBeenCalledWith('example.com', 'AAAA')
    }
    finally {
      resolve.mockRestore()
    }
  })

  it('looks up CNAME records', async () => {
    const resolveCname = spyOn(bunDns, 'resolveCname').mockResolvedValue(['github.com'])

    try {
      const result = await lookupDns('www.github.com', 'CNAME')
      expect(result).toEqual(['github.com'])
    }
    finally {
      resolveCname.mockRestore()
    }
  })

  it('looks up MX records', async () => {
    const resolveMx = spyOn(bunDns, 'resolveMx').mockResolvedValue([
      { priority: 10, exchange: 'mail.example.com' },
    ])

    try {
      const result = await lookupDns('example.com', 'MX')
      expect(result).toEqual([{ priority: 10, exchange: 'mail.example.com' }])
    }
    finally {
      resolveMx.mockRestore()
    }
  })

  it('looks up NS records', async () => {
    const resolveNs = spyOn(bunDns, 'resolveNs').mockResolvedValue(['a.iana-servers.net'])

    try {
      const result = await lookupDns('example.com', 'NS')
      expect(result).toEqual(['a.iana-servers.net'])
    }
    finally {
      resolveNs.mockRestore()
    }
  })

  it('joins TXT record parts', async () => {
    const resolveTxt = spyOn(bunDns, 'resolveTxt').mockResolvedValue([
      ['v=spf1 ', '-all'],
    ])

    try {
      const result = await lookupDns('example.com', 'TXT')
      expect(result).toEqual(['v=spf1 -all'])
    }
    finally {
      resolveTxt.mockRestore()
    }
  })

  it('looks up CAA records', async () => {
    const resolveCaa = spyOn(bunDns, 'resolveCaa').mockResolvedValue([
      { critical: 0, issue: 'letsencrypt.org' },
    ])

    try {
      const result = await lookupDns('example.com', 'CAA')
      expect(result).toEqual([{ critical: 0, issue: 'letsencrypt.org' }])
    }
    finally {
      resolveCaa.mockRestore()
    }
  })

  it('returns an empty list when no records exist', async () => {
    const error = Object.assign(new Error('queryCaa ENOTFOUND example.com'), {
      code: 'DNS_ENOTFOUND',
    })
    const resolveCaa = spyOn(bunDns, 'resolveCaa').mockRejectedValue(error)

    try {
      await expect(lookupDns('example.com', 'CAA')).resolves.toEqual([])
    }
    finally {
      resolveCaa.mockRestore()
    }
  })
})

describe('lookupAllDns', () => {
  function mockAll(overrides: Partial<Record<string, unknown>> = {}) {
    const spies = [
      spyOn(bunDns, 'resolve').mockResolvedValue(
        (overrides.resolve ?? [{ address: '93.184.216.34', ttl: 60 }]) as never,
      ),
      spyOn(bunDns, 'resolveCname').mockRejectedValue(
        Object.assign(new Error('queryCname ENOTFOUND'), { code: 'DNS_ENOTFOUND' }),
      ),
      spyOn(bunDns, 'resolveMx').mockResolvedValue([{ priority: 10, exchange: 'mail.example.com' }]),
      spyOn(bunDns, 'resolveNs').mockResolvedValue(['a.iana-servers.net']),
      spyOn(bunDns, 'resolveSoa').mockResolvedValue({
        nsname: 'ns1.example.com',
        hostmaster: 'dns.example.com',
        serial: 1,
        refresh: 10000,
        retry: 2400,
        expire: 604800,
        minttl: 300,
      }),
      spyOn(bunDns, 'resolveTxt').mockResolvedValue([['v=spf1 ', '-all']]),
      spyOn(bunDns, 'resolveCaa').mockResolvedValue([{ critical: 0, issue: 'letsencrypt.org' }]),
    ]
    return () => spies.forEach(spy => spy.mockRestore())
  }

  it('reads every common record type in one pass', async () => {
    const restore = mockAll()

    try {
      const summary = await lookupAllDns('EXAMPLE.COM.')

      expect(summary.domain).toBe('example.com')
      expect(summary.status).toBe('ok')
      expect(summary.answers.map(answer => answer.type)).toEqual([
        'A',
        'AAAA',
        'CNAME',
        'MX',
        'NS',
        'SOA',
        'TXT',
        'CAA',
      ])
      expect(typeof summary.elapsedMs).toBe('number')
      expect(summary.resolver.length).toBeGreaterThan(0)
    }
    finally {
      restore()
    }
  })

  it('keeps the ttl of address records and formats CAA records', async () => {
    const restore = mockAll()

    try {
      const summary = await lookupAllDns('example.com')
      const a = summary.answers.find(answer => answer.type === 'A')
      const caa = summary.answers.find(answer => answer.type === 'CAA')

      expect(a?.records[0]).toEqual({ type: 'A', value: '93.184.216.34', ttl: 60 })
      expect(caa?.records[0]?.value).toBe('0 issue "letsencrypt.org"')
    }
    finally {
      restore()
    }
  })

  it('reports a missing record type as nodata', async () => {
    const restore = mockAll()

    try {
      const summary = await lookupAllDns('example.com')
      const cname = summary.answers.find(answer => answer.type === 'CNAME')

      expect(cname?.status).toBe('nodata')
      expect(cname?.message).toBe('The domain has no CNAME record.')
    }
    finally {
      restore()
    }
  })

  it('reports a domain with no answer of any type as nxdomain', async () => {
    const notFound = Object.assign(new Error('queryA ENOTFOUND'), { code: 'DNS_ENOTFOUND' })
    const spies = [
      spyOn(bunDns, 'resolve').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveCname').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveMx').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveNs').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveSoa').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveTxt').mockRejectedValue(notFound),
      spyOn(bunDns, 'resolveCaa').mockRejectedValue(notFound),
    ]

    try {
      const summary = await lookupAllDns('no-such-domain.invalid')

      expect(summary.status).toBe('nxdomain')
      expect(summary.message).toBe('The domain no-such-domain.invalid does not exist.')
    }
    finally {
      spies.forEach(spy => spy.mockRestore())
    }
  })

  it('reports a resolver error as a failed lookup', async () => {
    const timeout = Object.assign(new Error('queryA ETIMEOUT'), { code: 'ETIMEOUT' })
    const spies = [
      spyOn(bunDns, 'resolve').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveCname').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveMx').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveNs').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveSoa').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveTxt').mockRejectedValue(timeout),
      spyOn(bunDns, 'resolveCaa').mockRejectedValue(timeout),
    ]

    try {
      const summary = await lookupAllDns('example.com')

      expect(summary.status).toBe('failed')
      expect(summary.message).toBe('The resolver did not answer. Try again.')
    }
    finally {
      spies.forEach(spy => spy.mockRestore())
    }
  })

  it('rejects a URL', async () => {
    await expect(lookupAllDns('https://example.com')).rejects.toThrow('Enter a domain, not a URL.')
  })
})
