import { describe, expect, it } from 'vitest'
import { analyzeSecurityHeaders } from '../../../shared/utils/network/security-headers'

describe('analyzeSecurityHeaders', () => {
  it('scores a strong header set highly', () => {
    const report = analyzeSecurityHeaders({
      'content-security-policy': 'default-src \'self\'',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'access-control-allow-origin': 'https://app.example.com'
    }, { requestOrigin: 'https://app.example.com' })

    expect(report.grade).toMatch(/A|B/)
    expect(report.score).toBeGreaterThanOrEqual(75)
    expect(report.cors.allowOrigin).toBe('https://app.example.com')
  })

  it('flags missing security headers and wildcard CORS with credentials', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true'
    })

    expect(report.findings.some(item => item.id === 'csp' && item.level === 'error')).toBe(true)
    expect(report.findings.some(item => item.id === 'hsts' && item.level === 'error')).toBe(true)
    expect(report.findings.some(item => item.id === 'cors-origin' && item.level === 'error')).toBe(true)
    expect(report.score).toBeLessThan(50)
  })
})
