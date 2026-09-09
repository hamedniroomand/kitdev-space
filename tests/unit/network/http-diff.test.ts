import type { HttpReport } from '#shared/utils/network/http-report'
import type { SecurityFinding } from '#shared/utils/network/security-headers'
import { describe, expect, it } from 'vitest'
import { diffHttpReports, parseHttpReport } from '#shared/utils/network/http-diff'
import { buildHttpReport, describeRedirect } from '#shared/utils/network/http-report'
import { analyzeSecurityHeaders } from '#shared/utils/network/security-headers'

function reportOf(headers: Record<string, string>, checkedAt = '2026-01-01T00:00:00.000Z'): HttpReport {
  return buildHttpReport({
    status: 200,
    statusText: 'OK',
    headers,
    url: 'https://example.com/',
    hops: [{ url: 'https://example.com/', status: 200 }],
    security: analyzeSecurityHeaders(headers),
    checkedAt,
    requestedUrl: 'https://example.com',
    method: 'HEAD',
  })
}

function findingOf(id: string, level: SecurityFinding['level'], value: string | null = null): SecurityFinding {
  return {
    id,
    level,
    header: id.toUpperCase(),
    title: `${id} title`,
    detail: 'detail',
    fix: level === 'ok' ? null : 'fix it',
    present: value !== null,
    value,
  }
}

function reportOfFindings(findings: SecurityFinding[], score = 50): HttpReport {
  return {
    tool: 'http-inspector',
    checkedAt: '2026-01-01T00:00:00.000Z',
    requestedUrl: 'https://example.com',
    finalUrl: 'https://example.com/',
    method: 'HEAD',
    requestOrigin: null,
    status: 200,
    statusText: 'OK',
    headers: {},
    hops: [],
    security: {
      score,
      grade: 'C',
      findings,
      cors: {
        allowOrigin: null,
        allowMethods: null,
        allowHeaders: null,
        allowCredentials: null,
        exposeHeaders: null,
        maxAge: null,
        findings: [],
      },
    },
  }
}

describe('buildHttpReport', () => {
  it('keeps the context of the check', () => {
    const report = reportOf({ 'x-content-type-options': 'nosniff' })

    expect(report.tool).toBe('http-inspector')
    expect(report.checkedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(report.requestedUrl).toBe('https://example.com')
    expect(report.finalUrl).toBe('https://example.com/')
    expect(report.method).toBe('HEAD')
    expect(report.headers).toEqual({ 'x-content-type-options': 'nosniff' })
  })

  it('adds an ISO timestamp when the result has none', () => {
    const report = buildHttpReport({
      status: 200,
      statusText: 'OK',
      headers: {},
      url: 'https://example.com/',
      hops: [],
      security: analyzeSecurityHeaders({}),
    })

    expect(report.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    expect(report.method).toBe('HEAD')
    expect(report.requestOrigin).toBeNull()
  })
})

describe('describeRedirect', () => {
  it('names a permanent redirect', () => {
    expect(describeRedirect(301)).toContain('Permanent')
    expect(describeRedirect(308)).toContain('Permanent')
  })

  it('names a temporary redirect', () => {
    expect(describeRedirect(302)).toContain('Temporary')
    expect(describeRedirect(303)).toContain('Temporary')
    expect(describeRedirect(307)).toContain('Temporary')
  })

  it('returns null for a status that is not a redirect', () => {
    expect(describeRedirect(200)).toBeNull()
    expect(describeRedirect(404)).toBeNull()
  })
})

describe('parseHttpReport', () => {
  it('reads an exported report file', () => {
    const report = reportOf({})
    const parsed = parseHttpReport(JSON.stringify(report))

    expect(parsed?.finalUrl).toBe('https://example.com/')
    expect(parsed?.security.findings.length).toBe(report.security.findings.length)
  })

  it('reads the raw API body', () => {
    const body = {
      result: {
        status: 200,
        statusText: 'OK',
        headers: {},
        url: 'https://example.com/',
        hops: [],
        security: analyzeSecurityHeaders({}),
        checkedAt: '2026-01-01T00:00:00.000Z',
      },
    }

    expect(parseHttpReport(JSON.stringify(body))?.finalUrl).toBe('https://example.com/')
  })

  it('returns null for text that is not JSON', () => {
    expect(parseHttpReport('not json')).toBeNull()
  })

  it('returns null for JSON without findings', () => {
    expect(parseHttpReport('{"hello":"world"}')).toBeNull()
    expect(parseHttpReport('[1,2,3]')).toBeNull()
  })
})

describe('diffHttpReports', () => {
  it('lists a new problem as added', () => {
    const previous = reportOfFindings([findingOf('csp', 'ok', 'default-src \'self\'')])
    const current = reportOfFindings([findingOf('csp', 'error')])

    const diff = diffHttpReports(previous, current)

    expect(diff.added.map(item => item.id)).toEqual(['csp'])
    expect(diff.resolved).toEqual([])
    expect(diff.changed).toEqual([])
  })

  it('lists a fixed problem as resolved', () => {
    const previous = reportOfFindings([findingOf('hsts', 'error')])
    const current = reportOfFindings([findingOf('hsts', 'ok', 'max-age=31536000')])

    const diff = diffHttpReports(previous, current)

    expect(diff.resolved.map(item => item.id)).toEqual(['hsts'])
    expect(diff.added).toEqual([])
  })

  it('lists a level change as modified', () => {
    const previous = reportOfFindings([findingOf('csp', 'error')])
    const current = reportOfFindings([findingOf('csp', 'warning', 'default-src *')])

    const diff = diffHttpReports(previous, current)

    expect(diff.changed).toHaveLength(1)
    expect(diff.changed[0]?.before.level).toBe('error')
    expect(diff.changed[0]?.after.level).toBe('warning')
  })

  it('lists a value change as modified', () => {
    const previous = reportOfFindings([findingOf('hsts', 'ok', 'max-age=31536000')])
    const current = reportOfFindings([findingOf('hsts', 'ok', 'max-age=63072000')])

    const diff = diffHttpReports(previous, current)

    expect(diff.changed).toHaveLength(1)
    expect(diff.added).toEqual([])
    expect(diff.resolved).toEqual([])
  })

  it('reports no change for two equal reports', () => {
    const headers = { 'x-content-type-options': 'nosniff' }
    const diff = diffHttpReports(reportOf(headers), reportOf(headers))

    expect(diff.added).toEqual([])
    expect(diff.resolved).toEqual([])
    expect(diff.changed).toEqual([])
    expect(diff.scoreDelta).toBe(0)
  })

  it('gives the score delta and the prior context', () => {
    const previous = reportOfFindings([findingOf('csp', 'error')], 40)
    const current = reportOfFindings([findingOf('csp', 'ok', 'default-src \'self\'')], 90)

    const diff = diffHttpReports(previous, current)

    expect(diff.scoreDelta).toBe(50)
    expect(diff.previousCheckedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(diff.previousUrl).toBe('https://example.com/')
  })

  it('treats a check that only the new report has as added', () => {
    const previous = reportOfFindings([])
    const current = reportOfFindings([findingOf('coop', 'warning')])

    expect(diffHttpReports(previous, current).added.map(item => item.id)).toEqual(['coop'])
  })
})
