import type { TlsCertItem, TlsCertSubject, TlsInspectionResult } from './types'

/** Where one certificate sits in the chain. */
export type TlsCertRole = 'leaf' | 'intermediate' | 'root'

/** One certificate of the chain, with the X.509 details of NET-43. */
export interface TlsChainCertificate extends TlsCertItem {
  keyType?: string
  keySize?: number
  curve?: string
  signatureAlgorithm?: string
  extendedKeyUsage?: string[]
  ocspUrls?: string[]
  crlUrls?: string[]
  pem?: string
}

/** The result of one inspection, with the enriched chain. */
export interface TlsReport extends TlsInspectionResult {
  chain: TlsChainCertificate[]
}

export type TlsCheckState = 'pass' | 'warn' | 'fail'

export type TlsCheckId = 'trust' | 'hostname' | 'validity'

/** One independent check that the page shows as a card. */
export interface TlsCheck {
  id: TlsCheckId
  title: string
  state: TlsCheckState
  summary: string
}

export type TlsChainIssueId = 'self-signed' | 'missing-intermediate' | 'chain-error'

export interface TlsChainIssue {
  id: TlsChainIssueId
  title: string
  detail: string
}

const SIGNATURE_ALGORITHM_NAMES: Record<string, string> = {
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
  '1.2.840.10045.4.3.3': 'ECDSA with SHA-384',
  '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
}

const EXTENDED_KEY_USAGE_NAMES: Record<string, string> = {
  '1.3.6.1.5.5.7.3.1': 'TLS server authentication',
  '1.3.6.1.5.5.7.3.2': 'TLS client authentication',
  '1.3.6.1.5.5.7.3.3': 'Code signing',
  '1.3.6.1.5.5.7.3.4': 'Email protection',
  '1.3.6.1.5.5.7.3.8': 'Time stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP signing',
}

const KEY_TYPE_NAMES: Record<string, string> = {
  'rsa': 'RSA',
  'rsa-pss': 'RSA-PSS',
  'ec': 'EC',
  'ed25519': 'Ed25519',
  'ed448': 'Ed448',
  'dsa': 'DSA',
}

export function signatureAlgorithmName(oid?: string): string | undefined {
  if (!oid) {
    return undefined
  }
  return SIGNATURE_ALGORITHM_NAMES[oid] ?? oid
}

export function extendedKeyUsageName(oid: string): string {
  return EXTENDED_KEY_USAGE_NAMES[oid] ?? oid
}

/** Read the public key type, the key size, and the curve as one line of text. */
export function describeKey(cert: TlsChainCertificate): string {
  if (!cert.keyType) {
    return '—'
  }
  const name = KEY_TYPE_NAMES[cert.keyType] ?? cert.keyType.toUpperCase()
  if (cert.keySize) {
    return `${name} ${cert.keySize} bit`
  }
  if (cert.curve) {
    return `${name} ${cert.curve}`
  }
  return name
}

function identity(name: TlsCertSubject): string {
  return [name.commonName, name.organization].filter(Boolean).join(' / ')
}

/** True when the subject and the issuer are the same name. */
export function isSelfIssued(cert: TlsCertItem): boolean {
  const subject = identity(cert.subject)
  return subject !== '' && subject === identity(cert.issuer)
}

/** The position of one certificate in the chain. The first one is the leaf. */
export function chainRole(cert: TlsCertItem, index: number): TlsCertRole {
  if (index === 0) {
    return 'leaf'
  }
  return isSelfIssued(cert) ? 'root' : 'intermediate'
}

export function chainRoleLabel(role: TlsCertRole): string {
  if (role === 'leaf') {
    return 'Leaf (server)'
  }
  return role === 'root' ? 'Root CA' : 'Intermediate CA'
}

function trustCheck(result: TlsReport): TlsCheck {
  return {
    id: 'trust',
    title: 'Trust Chain',
    state: result.authorized ? 'pass' : 'fail',
    summary: result.authorized
      ? 'A known certificate authority signed this chain.'
      : (result.authorizationError || 'No known certificate authority signed this chain.'),
  }
}

function hostnameCheck(result: TlsReport): TlsCheck {
  return {
    id: 'hostname',
    title: 'Hostname Match',
    state: result.matchesHost ? 'pass' : 'fail',
    summary: result.matchesHost
      ? `The certificate covers ${result.host}.`
      : `The certificate does not cover ${result.host}.`,
  }
}

function validityCheck(result: TlsReport): TlsCheck {
  if (result.status === 'expired') {
    return {
      id: 'validity',
      title: 'Validity Dates',
      state: 'fail',
      summary: 'The certificate is expired.',
    }
  }
  return {
    id: 'validity',
    title: 'Validity Dates',
    state: result.status === 'expiring_soon' ? 'warn' : 'pass',
    summary: `${result.daysRemaining} days remain.`,
  }
}

/** The three independent checks of NET-40. Each one keeps its own state. */
export function certificateChecks(result: TlsReport): TlsCheck[] {
  return [trustCheck(result), hostnameCheck(result), validityCheck(result)]
}

/**
 * The one verdict for the full certificate.
 * A failed check makes the certificate not valid, also when the dates are good.
 */
export function overallVerdict(result: TlsReport): { state: TlsCheckState, label: string } {
  const checks = certificateChecks(result)
  if (checks.some(check => check.state === 'fail')) {
    return { state: 'fail', label: 'Not valid' }
  }
  if (checks.some(check => check.state === 'warn')) {
    return { state: 'warn', label: 'Expires soon' }
  }
  return { state: 'pass', label: 'Valid' }
}

export function checkColor(state: TlsCheckState): 'success' | 'warning' | 'error' {
  if (state === 'pass') {
    return 'success'
  }
  return state === 'warn' ? 'warning' : 'error'
}

export function checkIcon(state: TlsCheckState): string {
  if (state === 'pass') {
    return 'i-lucide-circle-check'
  }
  return state === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-x'
}

/** The chain problems of NET-41. The tool shows each one. */
export function chainIssues(result: TlsReport): TlsChainIssue[] {
  const issues: TlsChainIssue[] = []
  const last = result.chain[result.chain.length - 1]
  const selfSigned = result.isSelfSigned || (result.chain.length === 1 && Boolean(last && isSelfIssued(last)))

  if (selfSigned) {
    issues.push({
      id: 'self-signed',
      title: 'Self-signed certificate',
      detail: 'The certificate signs itself. No certificate authority vouches for it.',
    })
  }
  else if (last && !isSelfIssued(last)) {
    issues.push({
      id: 'missing-intermediate',
      title: 'Missing intermediate',
      detail: 'The chain stops before a root certificate. The server must send each intermediate certificate.',
    })
  }

  if (!result.authorized && result.authorizationError) {
    issues.push({
      id: 'chain-error',
      title: 'Chain validation failed',
      detail: result.authorizationError,
    })
  }

  return issues
}

function readHeader(der: Uint8Array, at: number): { tag: number, start: number, end: number } | null {
  const tag = der[at]
  const first = der[at + 1]
  if (tag === undefined || first === undefined) {
    return null
  }
  let cursor = at + 2
  let length = first
  if (first & 0x80) {
    const count = first & 0x7F
    if (count === 0 || count > 4) {
      return null
    }
    length = 0
    for (let i = 0; i < count; i += 1) {
      const byte = der[cursor + i]
      if (byte === undefined) {
        return null
      }
      length = length * 256 + byte
    }
    cursor += count
  }
  const end = cursor + length
  return end > der.length ? null : { tag, start: cursor, end }
}

function decodeOid(bytes: Uint8Array): string {
  const first = bytes[0]
  if (first === undefined) {
    return ''
  }
  const parts = [String(Math.floor(first / 40)), String(first % 40)]
  let value = 0
  for (let i = 1; i < bytes.length; i += 1) {
    const byte = bytes[i]!
    value = value * 128 + (byte & 0x7F)
    if (!(byte & 0x80)) {
      parts.push(String(value))
      value = 0
    }
  }
  return parts.join('.')
}

/**
 * Read the signature algorithm OID of a DER certificate.
 * `X509Certificate` does not give this field, so the code walks the two
 * outer lengths: it skips `tbsCertificate` and reads the next OID.
 */
export function readSignatureAlgorithmOid(der: Uint8Array): string | undefined {
  const certificate = readHeader(der, 0)
  if (!certificate) {
    return undefined
  }
  const tbs = readHeader(der, certificate.start)
  if (!tbs) {
    return undefined
  }
  const algorithm = readHeader(der, tbs.end)
  if (!algorithm) {
    return undefined
  }
  const oid = readHeader(der, algorithm.start)
  if (!oid || oid.tag !== 0x06) {
    return undefined
  }
  return decodeOid(der.subarray(oid.start, oid.end))
}

const CRL_EXTENSION_OID = [0x06, 0x03, 0x55, 0x1D, 0x1F]
const URI_TAG = 0x86

function collectUris(der: Uint8Array, start: number, end: number, found: string[]): void {
  let at = start
  while (at < end) {
    const node = readHeader(der, at)
    if (!node) {
      return
    }
    if (node.tag === URI_TAG) {
      found.push(new TextDecoder().decode(der.subarray(node.start, node.end)))
    }
    else if (node.tag & 0x20) {
      collectUris(der, node.start, node.end, found)
    }
    at = node.end
  }
}

/**
 * Read the CRL distribution point URLs of a DER certificate.
 * The search stays inside extension 2.5.29.31, because the authority
 * information access extension uses the same URI tag.
 */
export function readCrlUrls(der: Uint8Array): string[] {
  for (let at = 0; at + CRL_EXTENSION_OID.length <= der.length; at += 1) {
    if (!CRL_EXTENSION_OID.every((byte, index) => der[at + index] === byte)) {
      continue
    }
    let node = readHeader(der, at + CRL_EXTENSION_OID.length)
    if (node?.tag === 0x01) {
      node = readHeader(der, node.end)
    }
    if (node?.tag !== 0x04) {
      return []
    }
    const found: string[] = []
    collectUris(der, node.start, node.end, found)
    return found
  }
  return []
}

/**
 * Read the OCSP responder URLs from the `infoAccess` text of `X509Certificate`.
 * Each line has the form `OCSP - URI:http://responder.example`.
 */
export function readOcspUrls(infoAccess?: string): string[] {
  if (!infoAccess) {
    return []
  }
  return infoAccess
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('OCSP - URI:'))
    .map(line => line.slice('OCSP - URI:'.length).trim())
    .filter(Boolean)
}
