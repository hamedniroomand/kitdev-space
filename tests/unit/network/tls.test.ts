import type { TlsInspectionResult } from '#server/utils/network/tls'
import { describe, expect, it } from 'vitest'
import { checkHostMatch, parseSans, parseSubject } from '#server/utils/network/tls'

describe('tls utilities', () => {
  it('parses subject information', () => {
    const rawSubject = {
      CN: 'example.com',
      O: 'Example Corp',
      OU: 'IT Dept',
      C: 'US',
      ST: 'California',
      L: 'San Francisco',
    }

    const parsed = parseSubject(rawSubject as unknown as Record<string, string>)
    expect(parsed.commonName).toBe('example.com')
    expect(parsed.organization).toBe('Example Corp')
    expect(parsed.country).toBe('US')
  })

  it('parses SANs string', () => {
    const sansStr = 'DNS:example.com, DNS:*.example.com, DNS:api.example.org'
    const sans = parseSans(sansStr)
    expect(sans).toEqual(['example.com', '*.example.com', 'api.example.org'])
  })

  it('checks host matches against SANs and wildcards', () => {
    const sans = ['example.com', '*.example.com', 'sub.domain.org']

    expect(checkHostMatch('example.com', sans)).toBe(true)
    expect(checkHostMatch('api.example.com', sans)).toBe(true)
    expect(checkHostMatch('nested.api.example.com', sans)).toBe(false)
    expect(checkHostMatch('other.com', sans)).toBe(false)
    expect(checkHostMatch('sub.domain.org', sans)).toBe(true)
  })

  it('falls back to Common Name if SANs is empty', () => {
    expect(checkHostMatch('myhost.local', [], 'myhost.local')).toBe(true)
    expect(checkHostMatch('diff.local', [], 'myhost.local')).toBe(false)
  })

  it('includes authorized and authorizationError fields in TlsInspectionResult', () => {
    // This test pins the type contract used by the Certificate Trust card.
    // The e2e fixture must match this shape so the UI renders correctly.
    const result: TlsInspectionResult = {
      host: 'example.com',
      port: 443,
      authorized: true,
      authorizationError: null,
      protocol: 'TLSv1.3',
      cipher: { name: 'TLS_AES_256_GCM_SHA384' },
      subject: { commonName: 'example.com' },
      issuer: { commonName: 'CA' },
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-12-31T23:59:59.000Z',
      daysRemaining: 75,
      status: 'valid',
      sans: ['example.com'],
      matchesHost: true,
      serialNumber: '1234',
      fingerprint256: 'AB:CD',
      fingerprint: 'AB',
      isSelfSigned: false,
      chain: [],
    }

    expect(result.authorized).toBe(true)
    expect(result.authorizationError).toBeNull()

    // An untrusted certificate sets authorized to false with a reason.
    const untrusted: TlsInspectionResult = {
      ...result,
      authorized: false,
      authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    }

    expect(untrusted.authorized).toBe(false)
    expect(untrusted.authorizationError).toBe('UNABLE_TO_VERIFY_LEAF_SIGNATURE')
  })
})
