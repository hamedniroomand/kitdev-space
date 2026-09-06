import { describe, expect, it } from 'vitest'
import {
  analyzeDkim,
  analyzeMx,
  buildEmailHealthResult,
  normalizeDkimSelectors,
  parseDmarc,
  parseSpf
} from '#shared/utils/network/email-health'

describe('parseSpf', () => {
  it('reports a missing SPF record', () => {
    const report = parseSpf(['v=DMARC1; p=none'])
    expect(report.present).toBe(false)
    expect(report.issues.some(issue => issue.code === 'spf-missing')).toBe(true)
  })

  it('parses mechanisms and flags soft fail', () => {
    const report = parseSpf(['v=spf1 include:_spf.google.com ~all'])
    expect(report.present).toBe(true)
    expect(report.mechanisms).toEqual([
      { qualifier: '+', type: 'include', value: '_spf.google.com', raw: 'include:_spf.google.com' },
      { qualifier: '~', type: 'all', value: undefined, raw: '~all' }
    ])
    expect(report.issues.some(issue => issue.code === 'spf-softfail')).toBe(true)
  })

  it('flags missing authorizing permissions', () => {
    const report = parseSpf(['v=spf1 -all'])
    expect(report.issues.some(issue => issue.code === 'spf-no-permissions')).toBe(true)
  })

  it('flags multiple SPF records', () => {
    const report = parseSpf(['v=spf1 -all', 'v=spf1 mx -all'])
    expect(report.issues.some(issue => issue.code === 'spf-multiple')).toBe(true)
  })
})

describe('analyzeMx', () => {
  it('sorts by priority and flags duplicate priorities', () => {
    const report = analyzeMx([
      { priority: 20, exchange: 'b.mail.example.com.' },
      { priority: 10, exchange: 'a.mail.example.com' },
      { priority: 10, exchange: 'c.mail.example.com' }
    ])

    expect(report.records.map(row => row.exchange)).toEqual([
      'a.mail.example.com',
      'c.mail.example.com',
      'b.mail.example.com'
    ])
    expect(report.issues.some(issue => issue.code === 'mx-duplicate-priority')).toBe(true)
  })

  it('flags IP exchange hosts', () => {
    const report = analyzeMx([{ priority: 10, exchange: '203.0.113.10' }])
    expect(report.records[0]?.issues.some(issue => issue.code === 'mx-ip-exchange')).toBe(true)
  })

  it('reports missing MX records', () => {
    const report = analyzeMx([])
    expect(report.issues.some(issue => issue.code === 'mx-missing')).toBe(true)
  })
})

describe('analyzeDkim', () => {
  it('marks selectors with DKIM keys as present', () => {
    const report = analyzeDkim([
      { selector: 'google', records: ['v=DKIM1; k=rsa; p=MIGf'] },
      { selector: 'default', records: [] }
    ])

    expect(report.selectors[0]?.present).toBe(true)
    expect(report.selectors[1]?.present).toBe(false)
    expect(report.issues.some(issue => issue.code === 'dkim-ok')).toBe(true)
  })
})

describe('normalizeDkimSelectors', () => {
  it('uses defaults when input is empty', () => {
    expect(normalizeDkimSelectors()).toContain('google')
    expect(normalizeDkimSelectors('')).toContain('default')
    expect(normalizeDkimSelectors([])).toContain('selector1')
  })

  it('parses a comma-separated list', () => {
    expect(normalizeDkimSelectors('Google, selector1')).toEqual(['google', 'selector1'])
  })
})

describe('parseDmarc', () => {
  function codes(records: string[]) {
    return parseDmarc(records).issues.map(item => item.code)
  }

  it('reports a missing record', () => {
    const report = parseDmarc(['v=spf1 mx -all'])
    expect(report.present).toBe(false)
    expect(report.policy).toBeNull()
    expect(report.percent).toBe(0)
    expect(report.issues.map(item => item.code)).toContain('dmarc-missing')
    expect(report.issues[0]?.level).toBe('error')
  })

  it('accepts a strict record', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; rua=mailto:reports@example.com'])
    expect(report.present).toBe(true)
    expect(report.policy).toBe('reject')
    expect(report.percent).toBe(100)
    expect(report.aggregateReportUris).toEqual(['mailto:reports@example.com'])
    expect(report.issues.map(item => item.code)).toEqual(['dmarc-ok'])
  })

  it('warns about a monitor-only policy', () => {
    expect(codes(['v=DMARC1; p=none; rua=mailto:r@example.com'])).toContain('dmarc-policy-none')
  })

  it('warns when no aggregate report address is set', () => {
    expect(codes(['v=DMARC1; p=reject'])).toContain('dmarc-no-rua')
  })

  it('warns about partial coverage', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; pct=50; rua=mailto:r@example.com'])
    expect(report.percent).toBe(50)
    expect(report.issues.map(item => item.code)).toContain('dmarc-partial-pct')
  })

  it('rejects a record with no p tag', () => {
    expect(codes(['v=DMARC1; rua=mailto:r@example.com'])).toContain('dmarc-no-policy')
  })

  it('rejects a bad policy value', () => {
    expect(codes(['v=DMARC1; p=block; rua=mailto:r@example.com'])).toContain('dmarc-bad-policy')
  })

  it('reads the subdomain policy', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; sp=none; rua=mailto:r@example.com'])
    expect(report.subdomainPolicy).toBe('none')
    expect(report.issues.map(item => item.code)).toContain('dmarc-subdomain-none')
  })

  it('reports more than one record', () => {
    expect(codes(['v=DMARC1; p=reject', 'v=DMARC1; p=none'])).toContain('dmarc-multiple')
  })

  it('warns about an unknown tag and a bad report address', () => {
    const found = codes(['v=DMARC1; p=reject; rua=reports@example.com; zz=1'])
    expect(found).toContain('dmarc-unknown-tag')
    expect(found).toContain('dmarc-bad-report-uri')
  })
})

describe('buildEmailHealthResult', () => {
  it('builds a combined report', () => {
    const result = buildEmailHealthResult({
      domain: 'example.com',
      txtRecords: ['v=spf1 mx -all'],
      dmarcRecords: ['v=DMARC1; p=reject; rua=mailto:r@example.com'],
      mxRecords: [{ priority: 10, exchange: 'mail.example.com' }],
      dkim: [{ selector: 'default', records: ['v=DKIM1; p=abc'] }]
    })

    expect(result.domain).toBe('example.com')
    expect(result.spf.present).toBe(true)
    expect(result.mx.records).toHaveLength(1)
    expect(result.dkim.selectors[0]?.present).toBe(true)
    expect(result.dmarc.policy).toBe('reject')
  })
})
