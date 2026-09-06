import { describe, expect, it } from 'vitest'
import {
  analyzeDkim,
  analyzeMx,
  buildEmailHealthResult,
  normalizeDkimSelectors,
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

describe('buildEmailHealthResult', () => {
  it('builds a combined report', () => {
    const result = buildEmailHealthResult({
      domain: 'example.com',
      txtRecords: ['v=spf1 mx -all'],
      mxRecords: [{ priority: 10, exchange: 'mail.example.com' }],
      dkim: [{ selector: 'default', records: ['v=DKIM1; p=abc'] }]
    })

    expect(result.domain).toBe('example.com')
    expect(result.spf.present).toBe(true)
    expect(result.mx.records).toHaveLength(1)
    expect(result.dkim.selectors[0]?.present).toBe(true)
  })
})
