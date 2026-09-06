import { isIPv4, isIPv6 } from 'node:net'

const MAX_DOMAIN_LENGTH = 253

/** IANA publishes the RDAP server of every TLD in this file. It changes rarely. */
const DNS_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000
const BOOTSTRAP_TIMEOUT_MS = 3000
/** rdap.org redirects to the right server, but it is a shared volunteer service. Use it as the fallback. */
const FALLBACK_BASE = 'https://rdap.org/'
const REQUEST_TIMEOUT_MS = 4500
const REQUEST_ATTEMPTS = 2
const DOMAIN_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

function assertDomainName(value: string): void {
  if (value.length > MAX_DOMAIN_LENGTH || !DOMAIN_NAME.test(value)) {
    throw new Error('Enter a valid domain name or IP address.')
  }
}

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

export function parseRdapEntity(entity: Record<string, unknown>): RdapRegistrar {
  const result: RdapRegistrar = {}

  // Check publicIds for IANA ID
  if (Array.isArray(entity.publicIds)) {
    const iana = entity.publicIds.find(p => p && typeof p === 'object' && p.type === 'IANA Registrar ID')
    if (iana?.identifier) {
      result.ianaId = String(iana.identifier)
    }
  }

  // Check vcardArray
  if (Array.isArray(entity.vcardArray) && entity.vcardArray[1] && Array.isArray(entity.vcardArray[1])) {
    const vcards = entity.vcardArray[1] as unknown[][]
    for (const v of vcards) {
      if (!Array.isArray(v) || v.length < 4)
        continue
      const fieldName = String(v[0]).toLowerCase()
      const val = v[3]

      if (fieldName === 'fn' && typeof val === 'string' && !result.name) {
        result.name = val
      }
      else if (fieldName === 'email' && typeof val === 'string' && !result.abuseEmail) {
        result.abuseEmail = val
      }
      else if (fieldName === 'tel' && typeof val === 'string' && !result.abusePhone) {
        result.abusePhone = val
      }
    }
  }

  // Nested entities (e.g. abuse contact)
  if (Array.isArray(entity.entities)) {
    for (const sub of entity.entities) {
      if (sub && typeof sub === 'object') {
        const subParsed = parseRdapEntity(sub as Record<string, unknown>)
        if (!result.name && subParsed.name)
          result.name = subParsed.name
        if (!result.abuseEmail && subParsed.abuseEmail)
          result.abuseEmail = subParsed.abuseEmail
        if (!result.abusePhone && subParsed.abusePhone)
          result.abusePhone = subParsed.abusePhone
      }
    }
  }

  return result
}

export function parseRdapData(data: Record<string, unknown>, query: string, type: 'domain' | 'ip'): RdapResult {
  const status: string[] = Array.isArray(data.status) ? data.status.map(String) : []

  let registrationDate: string | undefined
  let expirationDate: string | undefined
  let updatedDate: string | undefined
  let daysUntilExpiration: number | undefined

  if (Array.isArray(data.events)) {
    for (const ev of data.events) {
      if (!ev || typeof ev !== 'object')
        continue
      const action = String(ev.eventAction ?? '').toLowerCase()
      const dateStr = String(ev.eventDate ?? '')
      if (!dateStr)
        continue

      if (action === 'registration') {
        registrationDate = new Date(dateStr).toISOString()
      }
      else if (action === 'expiration') {
        expirationDate = new Date(dateStr).toISOString()
        const diffMs = new Date(dateStr).getTime() - Date.now()
        daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }
      else if (action === 'last changed' || action === 'last update of rdap database') {
        updatedDate = new Date(dateStr).toISOString()
      }
    }
  }

  // Extract Registrar
  let registrar: RdapRegistrar | undefined
  if (Array.isArray(data.entities)) {
    // Find entity with role 'registrar' or 'registrant'
    const regEntity = data.entities.find((e) => {
      if (!e || typeof e !== 'object')
        return false
      const roles = Array.isArray(e.roles) ? e.roles : []
      return roles.includes('registrar') || roles.includes('registrant')
    }) as Record<string, unknown> | undefined

    if (regEntity) {
      registrar = parseRdapEntity(regEntity)
    }
    else if (data.entities.length > 0) {
      registrar = parseRdapEntity(data.entities[0] as Record<string, unknown>)
    }
  }

  // Extract Nameservers
  const nameservers: string[] = []
  if (Array.isArray(data.nameservers)) {
    for (const ns of data.nameservers) {
      if (ns && typeof ns === 'object') {
        const name = String(ns.ldhName || ns.handle || '').toLowerCase()
        if (name)
          nameservers.push(name)
      }
    }
  }

  // Extract DNSSEC
  let dnssec: boolean | undefined
  if (data.secureDNS && typeof data.secureDNS === 'object') {
    dnssec = Boolean((data.secureDNS as Record<string, unknown>).delegationSigned)
  }

  return {
    query,
    type,
    found: true,
    status,
    registrationDate,
    expirationDate,
    updatedDate,
    daysUntilExpiration,
    registrar,
    nameservers,
    dnssec,
    raw: data,
  }
}

/** One entry of an IANA bootstrap file: a list of TLDs and a list of base URLs. */
export type RdapBootstrapService = [string[], string[]]

/**
 * Finds the RDAP base URL for a domain in a bootstrap table. The match is on
 * the longest suffix, so a two-label entry wins over its parent TLD. HTTPS
 * bases come first. Returns null when the table has no entry for the domain.
 */
export function resolveRdapBase(domain: string, services: RdapBootstrapService[]): string | null {
  const labels = domain.toLowerCase().split('.')
  for (let start = 0; start < labels.length; start++) {
    const suffix = labels.slice(start).join('.')
    for (const [tlds, urls] of services) {
      if (!tlds.some(tld => tld.toLowerCase() === suffix)) {
        continue
      }
      const base = urls.find(url => url.startsWith('https://')) ?? urls[0]
      if (base) {
        return base.endsWith('/') ? base : `${base}/`
      }
    }
  }
  return null
}

let bootstrapCache: { services: RdapBootstrapService[], fetchedAt: number } | null = null

/** Loads the DNS bootstrap table once a day. Returns null when IANA does not answer in time. */
async function loadDnsBootstrap(): Promise<RdapBootstrapService[] | null> {
  if (bootstrapCache && Date.now() - bootstrapCache.fetchedAt < BOOTSTRAP_TTL_MS) {
    return bootstrapCache.services
  }
  try {
    const res = await fetch(DNS_BOOTSTRAP_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS),
    })
    if (!res.ok) {
      return bootstrapCache?.services ?? null
    }
    const data = await res.json() as { services?: RdapBootstrapService[] }
    if (!Array.isArray(data.services)) {
      return bootstrapCache?.services ?? null
    }
    bootstrapCache = { services: data.services, fetchedAt: Date.now() }
    return data.services
  }
  catch {
    // A stale table is better than no table.
    return bootstrapCache?.services ?? null
  }
}

function isTimeout(cause: unknown): boolean {
  return cause instanceof Error && (cause.name === 'AbortError' || cause.name === 'TimeoutError')
}

/** Fetches one RDAP URL. A timeout gets one more attempt, because registries stall now and then. */
async function fetchRdap(url: string): Promise<Response> {
  let lastCause: unknown
  for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt++) {
    try {
      return await fetch(url, {
        headers: { Accept: 'application/rdap+json, application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    }
    catch (cause) {
      lastCause = cause
      if (!isTimeout(cause)) {
        throw cause
      }
    }
  }
  throw lastCause
}

export async function lookupRdap(rawQuery: string): Promise<RdapResult> {
  const clean = rawQuery.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0]!
  if (!clean) {
    throw new Error('Enter a domain or IP address.')
  }

  const isIp = isIPv4(clean) || isIPv6(clean)
  const type: 'domain' | 'ip' = isIp ? 'ip' : 'domain'

  // Every fetch target is an RDAP server from the IANA table or rdap.org, so an
  // SSRF check on `clean` would guard a host this function never contacts.
  // Validate the shape of the query instead, so only a domain name or an IP
  // address reaches the URL.
  if (!isIp) {
    assertDomainName(clean)
  }

  // A domain goes to the authoritative server in one hop. An IP keeps the
  // rdap.org redirector, because the IP bootstrap needs a CIDR match.
  const base = isIp ? null : resolveRdapBase(clean, (await loadDnsBootstrap()) ?? [])
  const targetUrl = `${base ?? FALLBACK_BASE}${type}/${encodeURIComponent(clean)}`

  try {
    const res = await fetchRdap(targetUrl)

    if (res.status === 404) {
      return {
        query: clean,
        type,
        found: false,
        status: ['available'],
        nameservers: [],
        raw: { message: 'Object does not exist or domain is available.' },
      }
    }

    if (!res.ok) {
      throw new Error(`RDAP query failed with status code ${res.status}.`)
    }

    const data = await res.json() as Record<string, unknown>
    return parseRdapData(data, clean, type)
  }
  catch (cause) {
    if (isTimeout(cause)) {
      const server = new URL(targetUrl).host
      throw new Error(`RDAP request for ${clean} timed out.\n\nThe server ${server} did not answer twice. Try again in a moment.`, { cause })
    }
    throw cause
  }
}
