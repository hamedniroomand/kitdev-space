import { describe, expect, it } from 'vitest'
import { analyzeSecurityHeaders, groupFindingsBySeverity, parseCsp } from '#shared/utils/network/security-headers'

describe('analyzeSecurityHeaders', () => {
  it('scores a strong header set highly', () => {
    const report = analyzeSecurityHeaders({
      'content-security-policy': 'default-src \'self\'',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'access-control-allow-origin': 'https://app.example.com',
    }, { requestOrigin: 'https://app.example.com' })

    expect(report.grade).toMatch(/A|B/)
    expect(report.score).toBeGreaterThanOrEqual(75)
    expect(report.cors.allowOrigin).toBe('https://app.example.com')
  })

  it('flags missing security headers and wildcard CORS with credentials', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
    })

    expect(report.findings.some(item => item.id === 'csp' && item.level === 'error')).toBe(true)
    expect(report.findings.some(item => item.id === 'hsts' && item.level === 'error')).toBe(true)
    expect(report.findings.some(item => item.id === 'cors-origin' && item.level === 'error')).toBe(true)
    expect(report.score).toBeLessThan(50)
  })

  it('gives a fix for every finding that is not ok', () => {
    const sets: Record<string, string>[] = [
      {},
      {
        'content-security-policy': 'default-src \'self\'; script-src \'unsafe-inline\'',
        'strict-transport-security': 'max-age=600',
        'x-frame-options': 'ALLOWALL',
        'x-content-type-options': 'sniff',
        'x-xss-protection': '1; mode=block',
        'server': 'nginx/1.25.3',
        'x-powered-by': 'Express',
        'content-type': 'text/html; charset=utf-8',
        'access-control-allow-origin': '*',
        'access-control-allow-credentials': 'true',
      },
    ]

    for (const headers of sets) {
      for (const item of analyzeSecurityHeaders(headers).findings) {
        if (item.level !== 'ok') {
          expect(item.fix, `${item.id} needs a fix`).toBeTruthy()
        }
      }
    }
  })
})

describe('modern header audit', () => {
  function findingOf(headers: Record<string, string>, id: string) {
    return analyzeSecurityHeaders(headers).findings.find(item => item.id === id)
  }

  it('accepts a Permissions-Policy header', () => {
    expect(findingOf({ 'permissions-policy': 'camera=(), microphone=()' }, 'permissions-policy')?.level).toBe('ok')
  })

  it('reports a missing Permissions-Policy header', () => {
    const item = findingOf({}, 'permissions-policy')

    expect(item?.level).toBe('info')
    expect(item?.fix).toBeTruthy()
  })

  it('accepts Cross-Origin-Opener-Policy same-origin', () => {
    expect(findingOf({ 'cross-origin-opener-policy': 'same-origin' }, 'coop')?.level).toBe('ok')
  })

  it('reports Cross-Origin-Opener-Policy unsafe-none', () => {
    expect(findingOf({ 'cross-origin-opener-policy': 'unsafe-none' }, 'coop')?.level).toBe('info')
  })

  it('accepts Cross-Origin-Embedder-Policy require-corp', () => {
    expect(findingOf({ 'cross-origin-embedder-policy': 'require-corp' }, 'coep')?.level).toBe('ok')
  })

  it('accepts Cross-Origin-Resource-Policy same-site', () => {
    expect(findingOf({ 'cross-origin-resource-policy': 'same-site' }, 'corp')?.level).toBe('ok')
  })

  it('flags the deprecated X-XSS-Protection header', () => {
    const item = findingOf({ 'x-xss-protection': '1; mode=block' }, 'x-xss-protection')

    expect(item?.level).toBe('warning')
    expect(item?.fix).toContain('Remove X-XSS-Protection')
  })

  it('adds no X-XSS-Protection finding when the header is absent', () => {
    expect(findingOf({}, 'x-xss-protection')).toBeUndefined()
  })

  it('warns when the server software discloses a version', () => {
    expect(findingOf({ server: 'nginx/1.25.3' }, 'server-disclosure')?.level).toBe('warning')
  })

  it('reports X-Powered-By without a version as info', () => {
    expect(findingOf({ 'x-powered-by': 'Express' }, 'server-disclosure')?.level).toBe('info')
  })

  it('accepts a response that names no server software', () => {
    expect(findingOf({}, 'server-disclosure')?.level).toBe('ok')
  })

  it('checks Cache-Control on an HTML response only', () => {
    expect(findingOf({ 'content-type': 'application/json' }, 'cache-control')).toBeUndefined()
    expect(findingOf({ 'content-type': 'text/html; charset=utf-8' }, 'cache-control')?.level).toBe('info')
    expect(findingOf({
      'content-type': 'text/html',
      'cache-control': 'no-store, max-age=0',
    }, 'cache-control')?.level).toBe('ok')
  })

  it('accepts an HSTS value that meets the preload requirements', () => {
    const item = findingOf({
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    }, 'hsts-preload')

    expect(item?.level).toBe('ok')
  })

  it('lists what an HSTS value needs for the preload list', () => {
    const item = findingOf({ 'strict-transport-security': 'max-age=15552000' }, 'hsts-preload')

    expect(item?.level).toBe('info')
    expect(item?.detail).toContain('includeSubDomains')
    expect(item?.fix).toContain('hstspreload.org')
  })

  it('adds no preload finding when HSTS is absent', () => {
    expect(findingOf({}, 'hsts-preload')).toBeUndefined()
  })

  it('keeps an optional modern header out of the score', () => {
    const strong = {
      'content-security-policy': 'default-src \'self\'',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
    }

    expect(analyzeSecurityHeaders(strong).grade).toBe('A')
  })
})

describe('parseCsp', () => {
  it('splits a policy into directives', () => {
    expect(parseCsp('default-src \'self\'; script-src \'self\' https://cdn.example.com')).toEqual({
      'default-src': ['\'self\''],
      'script-src': ['\'self\'', 'https://cdn.example.com'],
    })
  })

  it('reads a directive with no source', () => {
    expect(parseCsp('upgrade-insecure-requests;')).toEqual({ 'upgrade-insecure-requests': [] })
  })

  it('flags unsafe-inline and unsafe-eval', () => {
    const item = analyzeSecurityHeaders({
      'content-security-policy': 'default-src \'self\'; script-src \'unsafe-inline\' \'unsafe-eval\'',
    }).findings.find(entry => entry.id === 'csp')

    expect(item?.level).toBe('warning')
    expect(item?.detail).toContain('unsafe-inline')
    expect(item?.detail).toContain('unsafe-eval')
    expect(item?.fix).toContain('nonce')
  })

  it('flags a policy with no default fallback', () => {
    const item = analyzeSecurityHeaders({
      'content-security-policy': 'img-src \'self\'',
    }).findings.find(entry => entry.id === 'csp')

    expect(item?.level).toBe('warning')
    expect(item?.detail).toContain('no default-src')
  })

  it('accepts a policy with a default-src and no unsafe source', () => {
    const item = analyzeSecurityHeaders({
      'content-security-policy': 'default-src \'self\'; frame-ancestors \'none\'',
    }).findings.find(entry => entry.id === 'csp')

    expect(item?.level).toBe('ok')
    expect(item?.fix).toBeNull()
  })
})

describe('cORS preflight', () => {
  function corsFinding(report: ReturnType<typeof analyzeSecurityHeaders>, id: string) {
    return report.cors.findings.find(item => item.id === id)
  }

  it('flags a preflight redirect as a CORS violation', () => {
    const report = analyzeSecurityHeaders({}, {
      requestOrigin: 'https://app.example.com',
      requestMethod: 'PUT',
      preflightStatus: 302,
    })

    expect(corsFinding(report, 'cors-preflight')?.level).toBe('error')
    expect(corsFinding(report, 'cors-preflight')?.fix).toContain('redirect')
  })

  it('accepts a 204 preflight', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': 'https://app.example.com',
      'access-control-allow-methods': 'GET, PUT',
    }, {
      requestOrigin: 'https://app.example.com',
      requestMethod: 'PUT',
      preflightStatus: 204,
    })

    expect(corsFinding(report, 'cors-preflight')?.level).toBe('ok')
    expect(corsFinding(report, 'cors-methods')?.level).toBe('ok')
  })

  it('warns when the preflight returns a server error', () => {
    const report = analyzeSecurityHeaders({}, { preflightStatus: 500 })

    expect(corsFinding(report, 'cors-preflight')?.level).toBe('warning')
  })

  it('flags a method that the response does not allow', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-methods': 'GET, POST',
    }, { requestMethod: 'DELETE' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('error')
    expect(corsFinding(report, 'cors-methods')?.fix).toContain('DELETE')
  })

  it('accepts a method wildcard without credentials', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-methods': '*',
    }, { requestMethod: 'PATCH' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('ok')
  })

  it('flags a method wildcard with credentials', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-methods': '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'https://app.example.com',
    }, { requestMethod: 'PATCH' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('error')
  })

  it('matches the method without case', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-methods': 'get, put',
    }, { requestMethod: 'put' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('ok')
  })

  it('keeps a safelisted method as info when allow-methods is missing', () => {
    const report = analyzeSecurityHeaders({}, { requestMethod: 'GET' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('info')
  })

  it('flags a missing allow-methods for a method that needs a preflight', () => {
    const report = analyzeSecurityHeaders({}, { requestMethod: 'DELETE' })

    expect(corsFinding(report, 'cors-methods')?.level).toBe('error')
  })

  it('flags credentials with an origin wildcard', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
    })

    expect(corsFinding(report, 'cors-origin')?.level).toBe('error')
    expect(corsFinding(report, 'cors-credentials')?.level).toBe('warning')
  })

  it('accepts credentials with one specific origin', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': 'https://app.example.com',
      'access-control-allow-credentials': 'true',
    }, { requestOrigin: 'https://app.example.com' })

    expect(corsFinding(report, 'cors-credentials')?.level).toBe('ok')
  })

  it('flags an allow-origin that does not match the request Origin', () => {
    const report = analyzeSecurityHeaders({
      'access-control-allow-origin': 'https://other.example.com',
    }, { requestOrigin: 'https://app.example.com' })

    expect(corsFinding(report, 'cors-origin-echo')?.level).toBe('warning')
  })
})

describe('groupFindingsBySeverity', () => {
  it('orders the groups from critical to pass', () => {
    const report = analyzeSecurityHeaders({ 'x-content-type-options': 'nosniff' })
    const groups = groupFindingsBySeverity(report.findings)

    expect(groups.map(group => group.label)).toEqual(['Critical', 'Info', 'Pass'])
  })

  it('drops an empty group and keeps every finding', () => {
    const report = analyzeSecurityHeaders({})
    const groups = groupFindingsBySeverity(report.findings)
    const total = groups.reduce((sum, group) => sum + group.findings.length, 0)

    expect(groups.every(group => group.findings.length > 0)).toBe(true)
    expect(total).toBe(report.findings.length)
  })

  it('returns no group for an empty finding list', () => {
    expect(groupFindingsBySeverity([])).toEqual([])
  })
})
