import { describe, expect, it } from 'vitest'
import {
  buildDigCommand,
  buildDnsAnswer,
  buildDnsSummary,
  DNS_RECORD_TYPES,
  formatDnsRecord,
  toDnsRows,
} from '#shared/utils/network/dns'

describe('formatDnsRecord', () => {
  it('returns string records as is', () => {
    expect(formatDnsRecord('93.184.216.34')).toBe('93.184.216.34')
  })

  it('formats MX record objects with priority and exchange', () => {
    expect(formatDnsRecord({ priority: 10, exchange: 'mail.example.com' })).toBe('10 mail.example.com')
  })

  it('formats a null MX record with the root name', () => {
    expect(formatDnsRecord({ priority: 0, exchange: '' })).toBe('0 .')
  })

  it('formats CAA records of the resolver shape', () => {
    expect(formatDnsRecord({ critical: 0, issue: 'letsencrypt.org' }))
      .toBe('0 issue "letsencrypt.org"')
  })

  it('formats CAA records of the flags and tag shape', () => {
    expect(formatDnsRecord({ flags: 0, tag: 'issue', value: 'letsencrypt.org' }))
      .toBe('0 issue "letsencrypt.org"')
  })

  it('formats SOA records in dig field order', () => {
    expect(formatDnsRecord({
      nsname: 'ns1.example.com',
      hostmaster: 'dns.example.com',
      serial: 1,
      refresh: 10000,
      retry: 2400,
      expire: 604800,
      minttl: 300,
    })).toBe('ns1.example.com dns.example.com 1 10000 2400 604800 300')
  })

  it('formats address records with a ttl field', () => {
    expect(formatDnsRecord({ address: '93.184.216.34', ttl: 60 })).toBe('93.184.216.34')
  })
})

describe('toDnsRows', () => {
  it('keeps the ttl of address records', () => {
    expect(toDnsRows('A', [{ address: '93.184.216.34', ttl: 60 }]))
      .toEqual([{ type: 'A', value: '93.184.216.34', ttl: 60 }])
  })

  it('gives no ttl for records without one', () => {
    expect(toDnsRows('NS', ['a.iana-servers.net']))
      .toEqual([{ type: 'NS', value: 'a.iana-servers.net', ttl: null }])
  })
})

describe('buildDnsAnswer', () => {
  it('marks an answer with records as ok', () => {
    const answer = buildDnsAnswer('A', [{ address: '93.184.216.34', ttl: 60 }])
    expect(answer.status).toBe('ok')
    expect(answer.records).toHaveLength(1)
  })

  it('marks an empty answer as nodata', () => {
    const answer = buildDnsAnswer('CAA', [])
    expect(answer.status).toBe('nodata')
    expect(answer.message).toBe('The domain has no CAA record.')
  })

  it('marks an empty answer code as nodata', () => {
    expect(buildDnsAnswer('CAA', null, 'DNS_ENOTFOUND').status).toBe('nodata')
  })

  it('marks a resolver error as failed', () => {
    const answer = buildDnsAnswer('MX', null, 'ETIMEOUT')
    expect(answer.status).toBe('failed')
    expect(answer.message).toBe('The MX lookup failed. The resolver gave an error.')
  })
})

describe('buildDnsSummary', () => {
  const base = { domain: 'example.com', resolver: '1.1.1.1', elapsedMs: 12 }

  it('reports a domain with records as ok', () => {
    const summary = buildDnsSummary({
      ...base,
      answers: [
        buildDnsAnswer('A', [{ address: '93.184.216.34', ttl: 60 }]),
        buildDnsAnswer('CAA', []),
      ],
    })

    expect(summary.status).toBe('ok')
    expect(summary.answers[1]?.status).toBe('nodata')
    expect(summary.answers[1]?.message).toBe('The domain has no CAA record.')
    expect(summary.elapsedMs).toBe(12)
    expect(summary.resolver).toBe('1.1.1.1')
  })

  it('reports a domain with no answer of any type as nxdomain', () => {
    const summary = buildDnsSummary({
      ...base,
      answers: DNS_RECORD_TYPES.map(type => buildDnsAnswer(type, null, 'DNS_ENOTFOUND')),
    })

    expect(summary.status).toBe('nxdomain')
    expect(summary.message).toBe('The domain example.com does not exist.')
    expect(summary.answers.every(answer => answer.status === 'nxdomain')).toBe(true)
  })

  it('reports a resolver failure of every type as failed', () => {
    const summary = buildDnsSummary({
      ...base,
      answers: DNS_RECORD_TYPES.map(type => buildDnsAnswer(type, null, 'ETIMEOUT')),
    })

    expect(summary.status).toBe('failed')
    expect(summary.message).toBe('The resolver did not answer. Try again.')
  })

  it('keeps a nodata type separate from a failed type', () => {
    const summary = buildDnsSummary({
      ...base,
      answers: [buildDnsAnswer('A', []), buildDnsAnswer('MX', null, 'ESERVFAIL')],
    })

    expect(summary.status).toBe('nodata')
    expect(summary.answers[0]?.status).toBe('nodata')
    expect(summary.answers[1]?.status).toBe('failed')
  })
})

describe('buildDigCommand', () => {
  it('builds one command for every common record type', () => {
    expect(buildDigCommand('example.com')).toBe(
      'dig +noall +answer example.com A example.com AAAA example.com CNAME example.com MX '
      + 'example.com NS example.com SOA example.com TXT example.com CAA',
    )
  })

  it('builds a command for one record type', () => {
    expect(buildDigCommand('example.com', ['MX'])).toBe('dig +noall +answer example.com MX')
  })
})
