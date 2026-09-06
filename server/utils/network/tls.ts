import tls from 'node:tls'
import { assertSafeUrl, TLS_PORTS } from './ssrf'

export interface TlsCertSubject {
  commonName?: string
  organization?: string
  organizationalUnit?: string
  country?: string
  state?: string
  locality?: string
}

export interface TlsCertItem {
  subject: TlsCertSubject
  issuer: TlsCertSubject
  validFrom: string
  validTo: string
  serialNumber: string
  fingerprint256?: string
  fingerprint?: string
}

export interface TlsInspectionResult {
  host: string
  port: number
  authorized: boolean
  authorizationError?: string | null
  protocol: string
  cipher: {
    name: string
    version?: string
  }
  subject: TlsCertSubject
  issuer: TlsCertSubject
  validFrom: string
  validTo: string
  daysRemaining: number
  status: 'valid' | 'expiring_soon' | 'expired'
  sans: string[]
  matchesHost: boolean
  serialNumber: string
  fingerprint256: string
  fingerprint: string
  isSelfSigned: boolean
  chain: TlsCertItem[]
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
    .map(entry => (entry.startsWith('DNS:') ? entry.slice(4).trim() : entry))
    .filter(Boolean)
}

export function checkHostMatch(host: string, sans: string[], cn?: string): boolean {
  const target = host.toLowerCase()
  const candidates = [...sans]
  if (cn)
    candidates.push(cn)

  return candidates.some((cand) => {
    const pattern = cand.toLowerCase()
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

export async function inspectTlsCertificate(
  rawHost: string,
  port = 443,
  timeoutMs = 6000,
): Promise<TlsInspectionResult> {
  const cleanHost = rawHost.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0]!
  if (!cleanHost) {
    throw new Error('Enter a valid hostname.')
  }

  // Enforce SSRF validation. Restrict the port to ports that serve TLS, so
  // this tool cannot scan arbitrary ports on a third-party host.
  await assertSafeUrl(`https://${cleanHost}:${port}`, { allowedPorts: TLS_PORTS })

  return new Promise((resolve, reject) => {
    // Declared before the timer, which destroys it on a timeout.
    let socket: tls.TLSSocket
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Connection to ${cleanHost}:${port} timed out.`))
    }, timeoutMs)

    socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost,
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
          const matchesHost = checkHostMatch(cleanHost, sans, subject.commonName)

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

          // Build certificate chain
          const chain: TlsCertItem[] = []
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
            host: cleanHost,
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
