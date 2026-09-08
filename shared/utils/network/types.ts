export interface RdapRegistrar {
  name?: string
  ianaId?: string
  abuseEmail?: string
  abusePhone?: string
}

export interface RdapResult {
  query: string
  type: 'domain' | 'ip'
  found: boolean
  status: string[]
  registrationDate?: string
  expirationDate?: string
  updatedDate?: string
  daysUntilExpiration?: number
  registrar?: RdapRegistrar
  nameservers: string[]
  dnssec?: boolean
  raw: Record<string, unknown>
}

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
