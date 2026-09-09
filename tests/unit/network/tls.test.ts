import type { TlsInspectionResult } from '#server/utils/network/tls'
import type { TlsChainCertificate, TlsReport } from '#shared/utils/network/tls-report'
import { describe, expect, it } from 'vitest'
import { checkHostMatch, formatHostForUrl, parseHostInput, parseSans, parseSubject } from '#server/utils/network/tls'
import {
  certificateChecks,
  chainIssues,
  chainRole,
  chainRoleLabel,
  describeKey,
  extendedKeyUsageName,
  isSelfIssued,
  overallVerdict,
  readCrlUrls,
  readOcspUrls,
  readSignatureAlgorithmOid,
  signatureAlgorithmName,
} from '#shared/utils/network/tls-report'

const baseResult: TlsReport = {
  host: 'example.com',
  port: 443,
  authorized: true,
  authorizationError: null,
  protocol: 'TLSv1.3',
  cipher: { name: 'TLS_AES_256_GCM_SHA384' },
  subject: { commonName: 'example.com' },
  issuer: { commonName: 'Example CA', organization: 'Example Trust' },
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
  chain: [
    { subject: { commonName: 'example.com' }, issuer: { commonName: 'Example CA', organization: 'Example Trust' }, validFrom: '2026-01-01T00:00:00.000Z', validTo: '2026-12-31T23:59:59.000Z', serialNumber: '1234' },
    { subject: { commonName: 'Example CA', organization: 'Example Trust' }, issuer: { commonName: 'Example CA', organization: 'Example Trust' }, validFrom: '2020-01-01T00:00:00.000Z', validTo: '2030-12-31T23:59:59.000Z', serialNumber: '99' },
  ],
}

/** Build one DER tag-length-value node, so a test needs no certificate file. */
function tlv(tag: number, content: number[]): number[] {
  if (content.length < 0x80) {
    return [tag, content.length, ...content]
  }
  return [tag, 0x81, content.length, ...content]
}

function ascii(text: string): number[] {
  return [...text].map(char => char.charCodeAt(0))
}

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

  it('parses IP address SANs', () => {
    expect(parseSans('DNS:localhost, IP Address:0:0:0:0:0:0:0:1, IP Address:127.0.0.1'))
      .toEqual(['localhost', '0:0:0:0:0:0:0:1', '127.0.0.1'])
  })

  it('checks host matches against SANs and wildcards', () => {
    const sans = ['example.com', '*.example.com', 'sub.domain.org']

    expect(checkHostMatch('example.com', sans)).toBe(true)
    expect(checkHostMatch('api.example.com', sans)).toBe(true)
    expect(checkHostMatch('nested.api.example.com', sans)).toBe(false)
    expect(checkHostMatch('other.com', sans)).toBe(false)
    expect(checkHostMatch('sub.domain.org', sans)).toBe(true)
  })

  it('matches an IPv6 host against a long form IPv6 SAN', () => {
    expect(checkHostMatch('::1', ['0:0:0:0:0:0:0:1'])).toBe(true)
    expect(checkHostMatch('::1', ['::2'])).toBe(false)
  })

  it('falls back to Common Name if SANs is empty', () => {
    expect(checkHostMatch('myhost.local', [], 'myhost.local')).toBe(true)
    expect(checkHostMatch('diff.local', [], 'myhost.local')).toBe(false)
  })

  it('includes authorized and authorizationError fields in TlsInspectionResult', () => {
    // This test pins the type contract used by the Certificate Trust card.
    // The e2e fixture must match this shape so the UI renders correctly.
    const result: TlsInspectionResult = { ...baseResult }

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

describe('host input parsing', () => {
  it('reads a plain hostname', () => {
    expect(parseHostInput(' example.com ')).toEqual({ host: 'example.com', port: undefined })
  })

  it('reads a hostname with a port', () => {
    expect(parseHostInput('example.com:8443')).toEqual({ host: 'example.com', port: 8443 })
  })

  it('removes the scheme and the path', () => {
    expect(parseHostInput('https://example.com/status?a=1')).toEqual({ host: 'example.com', port: undefined })
  })

  it('reads a bracketed IPv6 address with a port', () => {
    expect(parseHostInput('[::1]:443')).toEqual({ host: '::1', port: 443 })
  })

  it('reads a bracketed IPv6 address without a port', () => {
    expect(parseHostInput('[2001:db8::1]')).toEqual({ host: '2001:db8::1', port: undefined })
  })

  it('reads a bracketed IPv6 URL with a path', () => {
    expect(parseHostInput('https://[2001:db8::1]:8443/health')).toEqual({ host: '2001:db8::1', port: 8443 })
  })

  it('reads a bare IPv6 address', () => {
    expect(parseHostInput('2001:db8::1')).toEqual({ host: '2001:db8::1' })
  })

  it('puts an IPv6 address in brackets for a URL', () => {
    expect(formatHostForUrl('::1')).toBe('[::1]')
    expect(formatHostForUrl('example.com')).toBe('example.com')
  })
})

describe('certificate checks', () => {
  it('gives three independent checks', () => {
    const checks = certificateChecks(baseResult)
    expect(checks.map(check => check.id)).toEqual(['trust', 'hostname', 'validity'])
    expect(checks.every(check => check.state === 'pass')).toBe(true)
  })

  it('fails the trust check alone when the chain is not trusted', () => {
    const checks = certificateChecks({ ...baseResult, authorized: false, authorizationError: 'SELF_SIGNED_CERT_IN_CHAIN' })
    expect(checks[0]!.state).toBe('fail')
    expect(checks[0]!.summary).toBe('SELF_SIGNED_CERT_IN_CHAIN')
    expect(checks[1]!.state).toBe('pass')
    expect(checks[2]!.state).toBe('pass')
  })

  it('warns when the certificate expires soon', () => {
    const checks = certificateChecks({ ...baseResult, status: 'expiring_soon', daysRemaining: 5 })
    expect(checks[2]!.state).toBe('warn')
    expect(overallVerdict({ ...baseResult, status: 'expiring_soon', daysRemaining: 5 }).label).toBe('Expires soon')
  })

  it('does not report a valid certificate when the hostname does not match', () => {
    const mismatch: TlsReport = { ...baseResult, matchesHost: false }
    expect(mismatch.status).toBe('valid')
    expect(overallVerdict(mismatch)).toEqual({ state: 'fail', label: 'Not valid' })
  })

  it('reports a valid certificate when every check passes', () => {
    expect(overallVerdict(baseResult)).toEqual({ state: 'pass', label: 'Valid' })
  })
})

describe('certificate chain', () => {
  it('names the leaf, the intermediate, and the root', () => {
    const chain: TlsChainCertificate[] = [
      baseResult.chain[0]!,
      { ...baseResult.chain[0]!, subject: { commonName: 'Intermediate CA' }, issuer: { commonName: 'Root CA' } },
      { ...baseResult.chain[0]!, subject: { commonName: 'Root CA' }, issuer: { commonName: 'Root CA' } },
    ]
    expect(chain.map((cert, index) => chainRole(cert, index))).toEqual(['leaf', 'intermediate', 'root'])
    expect(chainRoleLabel('leaf')).toBe('Leaf (server)')
    expect(chainRoleLabel('intermediate')).toBe('Intermediate CA')
    expect(chainRoleLabel('root')).toBe('Root CA')
  })

  it('detects a self-issued certificate', () => {
    expect(isSelfIssued(baseResult.chain[1]!)).toBe(true)
    expect(isSelfIssued(baseResult.chain[0]!)).toBe(false)
  })

  it('reports no issue for a complete chain', () => {
    expect(chainIssues(baseResult)).toEqual([])
  })

  it('flags a missing intermediate', () => {
    const short: TlsReport = { ...baseResult, chain: [baseResult.chain[0]!] }
    expect(chainIssues(short).map(issue => issue.id)).toEqual(['missing-intermediate'])
  })

  it('flags a self-signed certificate instead of a missing intermediate', () => {
    const selfSigned: TlsReport = {
      ...baseResult,
      isSelfSigned: true,
      chain: [{ ...baseResult.chain[0]!, issuer: { commonName: 'example.com' } }],
    }
    expect(chainIssues(selfSigned).map(issue => issue.id)).toEqual(['self-signed'])
  })

  it('shows the chain validation error', () => {
    const broken: TlsReport = {
      ...baseResult,
      authorized: false,
      authorizationError: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    }
    const issues = chainIssues(broken)
    expect(issues.map(issue => issue.id)).toEqual(['chain-error'])
    expect(issues[0]!.detail).toBe('UNABLE_TO_VERIFY_LEAF_SIGNATURE')
  })
})

describe('x.509 details', () => {
  it('describes the public key', () => {
    expect(describeKey({ ...baseResult.chain[0]!, keyType: 'rsa', keySize: 2048 })).toBe('RSA 2048 bit')
    expect(describeKey({ ...baseResult.chain[0]!, keyType: 'ec', curve: 'prime256v1' })).toBe('EC prime256v1')
    expect(describeKey({ ...baseResult.chain[0]!, keyType: 'ed25519' })).toBe('Ed25519')
    expect(describeKey(baseResult.chain[0]!)).toBe('—')
  })

  it('names known algorithm and key usage OIDs', () => {
    expect(signatureAlgorithmName('1.2.840.113549.1.1.11')).toBe('SHA-256 with RSA')
    expect(signatureAlgorithmName('1.2.840.10045.4.3.2')).toBe('ECDSA with SHA-256')
    expect(signatureAlgorithmName('9.9.9')).toBe('9.9.9')
    expect(signatureAlgorithmName(undefined)).toBeUndefined()
    expect(extendedKeyUsageName('1.3.6.1.5.5.7.3.1')).toBe('TLS server authentication')
    expect(extendedKeyUsageName('9.9.9')).toBe('9.9.9')
  })

  it('reads the signature algorithm OID from DER bytes', () => {
    const sha256WithRsa = [0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x0B]
    const der = new Uint8Array(tlv(0x30, [
      ...tlv(0x30, []),
      ...tlv(0x30, [...sha256WithRsa, 0x05, 0x00]),
      ...tlv(0x03, [0x00, 0x00]),
    ]))

    expect(readSignatureAlgorithmOid(der)).toBe('1.2.840.113549.1.1.11')
    expect(readSignatureAlgorithmOid(new Uint8Array([0x30]))).toBeUndefined()
  })

  it('reads CRL distribution URLs from the matching extension only', () => {
    const crlUrl = 'http://crl.example.com/a.crl'
    const der = new Uint8Array([
      // An authority information access URI must not appear in the result.
      ...tlv(0x86, ascii('http://ocsp.example.com')),
      0x06,
      0x03,
      0x55,
      0x1D,
      0x1F,
      ...tlv(0x04, tlv(0x30, tlv(0x30, tlv(0xA0, tlv(0xA0, tlv(0x86, ascii(crlUrl))))))),
    ])

    expect(readCrlUrls(der)).toEqual([crlUrl])
    expect(readCrlUrls(new Uint8Array([0x30, 0x00]))).toEqual([])
  })

  it('reads OCSP responder URLs from the info access text', () => {
    const infoAccess = 'CA Issuers - URI:http://ca.example.com/ca.der\nOCSP - URI:http://ocsp.example.com\n'
    expect(readOcspUrls(infoAccess)).toEqual(['http://ocsp.example.com'])
    expect(readOcspUrls(undefined)).toEqual([])
  })
})
