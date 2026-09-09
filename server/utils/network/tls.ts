import type { TlsChainCertificate, TlsReport } from '#shared/utils/network/tls-report'
import { X509Certificate } from 'node:crypto'
import { isIP, isIPv6 } from 'node:net'
import tls from 'node:tls'
import {
  extendedKeyUsageName,
  readCrlUrls,
  readOcspUrls,
  readSignatureAlgorithmOid,
  signatureAlgorithmName,
} from '#shared/utils/network/tls-report'
import { assertSafeUrl, TLS_PORTS } from './ssrf'

export type { TlsChainCertificate, TlsReport } from '#shared/utils/network/tls-report'

export type {
  TlsCertItem,
  TlsCertSubject,
  TlsInspectionResult,
} from '#shared/utils/network/types'

export interface TlsTarget {
  host: string
  port?: number
}

export function parseSubject(peerSubject: tls.Certificate | tls.DetailedPeerCertificate['subject']): TlsCertSubject {
  if (!peerSubject || typeof peerSubject !== 'object') {
    return {}
  }
  const s = peerSubject as Record<string, unknown>
  return {
    commonName: typeof s.CN === 'string' ? s.CN : undefined,
    organization: typeof s.O === 'string' ? s.O : undefined,
    organizationalUnit: typeof s.OU === 'string' ? s.OU : undefined,
    country: typeof s.C === 'string' ? s.C : undefined,
    state: typeof s.ST === 'string' ? s.ST : undefined,
    locality: typeof s.L === 'string' ? s.L : undefined,
  }
}

export function parseSans(altnames?: string): string[] {
  if (!altnames)
    return []
  return altnames
    .split(',')
    .map(entry => entry.trim())
    // Only a DNS name and an IP address are host names. A URI or an email SAN
    // keeps its prefix, so the host match cannot read it as a host name.
    .map(entry => entry.replace(/^(?:DNS|IP Address):/i, '').trim())
    .filter(Boolean)
}

/** Write one host in the form that `URL` and a certificate name comparison accept. */
function normalizeHostValue(value: string): string {
  const bare = value.replace(/^\[|\]$/g, '')
  if (isIPv6(bare)) {
    try {
      return new URL(`http://[${bare}]`).hostname
    }
    catch {
      return bare.toLowerCase()
    }
  }
  return value.toLowerCase()
}

export function checkHostMatch(host: string, sans: string[], cn?: string): boolean {
  const target = normalizeHostValue(host)
  const candidates = [...sans]
  if (cn)
    candidates.push(cn)

  return candidates.some((cand) => {
    const pattern = normalizeHostValue(cand)
    if (pattern === target)
      return true
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2)
      const targetParts = target.split('.')
      if (targetParts.length > 1) {
        targetParts.shift()
        return targetParts.join('.') === suffix
      }
    }
    return false
  })
}

/**
 * Read a host and an optional port from user input.
 * The input can have a scheme, a path, and an IPv6 address in brackets,
 * such as `https://[2001:db8::1]:8443/status`.
 */
export function parseHostInput(raw: string): TlsTarget {
  const withoutScheme = raw.trim().replace(/^[a-z][\w+.-]*:\/\//i, '')
  const authority = withoutScheme.split(/[/?#]/)[0]!.replace(/^.*@/, '')

  const bracketed = authority.match(/^\[([^\]]+)\](?::(\d+))?$/)
  if (bracketed) {
    return { host: bracketed[1]!, port: bracketed[2] ? Number(bracketed[2]) : undefined }
  }

  if (isIPv6(authority)) {
    return { host: authority }
  }

  const withPort = authority.match(/^([^:]+):(\d+)$/)
  if (withPort) {
    return { host: withPort[1]!, port: Number(withPort[2]) }
  }

  return { host: authority.split(':')[0]! }
}

/** Put an IPv6 address in brackets, so `URL` accepts it. */
export function formatHostForUrl(host: string): string {
  return isIPv6(host) ? `[${host}]` : host
}

/** Read the X.509 details that the TLS peer certificate does not give. */
function certificateDetails(raw?: Uint8Array): Partial<TlsChainCertificate> {
  if (!raw || raw.length === 0) {
    return {}
  }
  try {
    const certificate = new X509Certificate(raw)
    const key = certificate.publicKey
    const details = key.asymmetricKeyDetails
    return {
      keyType: key.asymmetricKeyType,
      keySize: typeof details?.modulusLength === 'number' ? details.modulusLength : undefined,
      curve: typeof details?.namedCurve === 'string' ? details.namedCurve : undefined,
      signatureAlgorithm: signatureAlgorithmName(readSignatureAlgorithmOid(certificate.raw)),
      extendedKeyUsage: certificate.keyUsage?.map(extendedKeyUsageName),
      ocspUrls: readOcspUrls(certificate.infoAccess),
      crlUrls: readCrlUrls(certificate.raw),
      pem: certificate.toString(),
    }
  }
  catch {
    return {}
  }
}

/**
 * Open one TLS connection and read the certificate chain.
 * This function does no SSRF check. Use `inspectTlsCertificate` for user input.
 */
export function readTlsCertificate(host: string, port = 443, timeoutMs = 6000): Promise<TlsReport> {
  return new Promise((resolve, reject) => {
    // Declared before the timer, which destroys it on a timeout.
    let socket: tls.TLSSocket
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Connection to ${formatHostForUrl(host)}:${port} timed out.`))
    }, timeoutMs)

    socket = tls.connect(
      {
        host,
        port,
        // RFC 6066 does not permit an IP address in the server name extension.
        ...(isIP(host) === 0 ? { servername: host } : {}),
        rejectUnauthorized: false,
      },
      () => {
        clearTimeout(timer)
        try {
          const peer = socket.getPeerCertificate(true)
          if (!peer || Object.keys(peer).length === 0) {
            socket.end()
            reject(new Error('No certificate received from the server.'))
            return
          }

          const cipher = socket.getCipher()
          const protocol = socket.getProtocol() || 'Unknown'
          const authorized = socket.authorized
          const authorizationError = socket.authorizationError ? String(socket.authorizationError) : null

          const subject = parseSubject(peer.subject)
          const issuer = parseSubject(peer.issuer)
          const sans = parseSans(peer.subjectaltname)
          const matchesHost = checkHostMatch(host, sans, subject.commonName)

          const validFrom = new Date(peer.valid_from).toISOString()
          const validTo = new Date(peer.valid_to).toISOString()
          const now = Date.now()
          const expiryTime = new Date(peer.valid_to).getTime()
          const diffMs = expiryTime - now
          const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))

          let status: 'valid' | 'expiring_soon' | 'expired' = 'valid'
          if (diffMs <= 0) {
            status = 'expired'
          }
          else if (daysRemaining <= 30) {
            status = 'expiring_soon'
          }

          // Build the certificate chain, from the leaf to the last certificate sent.
          const chain: TlsChainCertificate[] = []
          let curr: tls.DetailedPeerCertificate | null = peer
          const seenFingerprints = new Set<string>()

          while (curr && curr.fingerprint256 && !seenFingerprints.has(curr.fingerprint256)) {
            seenFingerprints.add(curr.fingerprint256)
            chain.push({
              subject: parseSubject(curr.subject),
              issuer: parseSubject(curr.issuer),
              validFrom: new Date(curr.valid_from).toISOString(),
              validTo: new Date(curr.valid_to).toISOString(),
              serialNumber: curr.serialNumber,
              fingerprint256: curr.fingerprint256,
              fingerprint: curr.fingerprint,
              ...certificateDetails(curr.raw),
            })

            if (curr.issuerCertificate && curr.issuerCertificate !== curr) {
              curr = curr.issuerCertificate
            }
            else {
              break
            }
          }

          const isSelfSigned = (
            (peer.fingerprint256 === peer.issuerCertificate?.fingerprint256)
            || (subject.commonName && subject.commonName === issuer.commonName)
          ) || false

          socket.end()

          resolve({
            host,
            port,
            authorized,
            authorizationError,
            protocol,
            cipher: {
              name: cipher?.name || 'Unknown',
              version: cipher?.version,
            },
            subject,
            issuer,
            validFrom,
            validTo,
            daysRemaining,
            status,
            sans,
            matchesHost,
            serialNumber: peer.serialNumber,
            fingerprint256: peer.fingerprint256,
            fingerprint: peer.fingerprint,
            isSelfSigned: Boolean(isSelfSigned),
            chain,
          })
        }
        catch (cause) {
          socket.destroy()
          reject(cause)
        }
      },
    )

    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function inspectTlsCertificate(
  rawHost: string,
  port = 443,
  timeoutMs = 6000,
): Promise<TlsReport> {
  const target = parseHostInput(rawHost)
  if (!target.host) {
    throw new Error('Enter a valid hostname.')
  }
  // A port in the host input wins, because the user wrote it last.
  const targetPort = target.port ?? port

  // Enforce SSRF validation. Restrict the port to ports that serve TLS, so
  // this tool cannot scan arbitrary ports on a third-party host.
  await assertSafeUrl(`https://${formatHostForUrl(target.host)}:${targetPort}`, { allowedPorts: TLS_PORTS })

  return readTlsCertificate(target.host, targetPort, timeoutMs)
}
