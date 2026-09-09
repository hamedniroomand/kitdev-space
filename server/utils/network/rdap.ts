import { isIPv4, isIPv6 } from 'node:net'
import { assertSafeUrl } from './ssrf'

const MAX_DOMAIN_LENGTH = 253

/** IANA publishes the RDAP server of every TLD in this file. It changes rarely. */
const DNS_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000
const BOOTSTRAP_TIMEOUT_MS = 3000
/** rdap.org redirects to the right server, but it is a shared volunteer service. Use it as the fallback. */
const FALLBACK_BASE = 'https://rdap.org/'
const REQUEST_TIMEOUT_MS = 4500
const REQUEST_ATTEMPTS = 2
/** A registrar referral can point to one more referral. Two fetches are enough. */
const MAX_REFERRAL_HOPS = 2
const DOMAIN_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

function assertDomainName(value: string): void {
  if (value.length > MAX_DOMAIN_LENGTH || !DOMAIN_NAME.test(value)) {
    throw new Error('Enter a valid domain name or IP address.')
  }
}

export type { RdapRegistrar, RdapResult } from '#shared/utils/network/types'

/**
 * The lookup adds the source of the answer to the parsed record. Every field is
 * optional, so a caller that reads `RdapResult` keeps its shape.
 */
export interface RdapLookupResult extends RdapResult {
  /** The RDAP endpoint that answered the first query. */
  server?: string
  /** The start time of the query, in ISO 8601 format. */
  queriedAt?: string
  /** The time that the query needed, in milliseconds. */
  durationMs?: number
  /** Labels of the fields that the registry hides for privacy. */
  redactedFields?: string[]
  /** Registrar RDAP endpoints that the lookup followed after the registry answer. */
  referrals?: string[]
}

/** A registry writes this text in a field that it hides for privacy. */
const REDACTED_VALUE = /redacted|not disclosed|data protected/i

export interface ParsedRdapEntity extends RdapRegistrar {
  /** Labels of the fields that the registry hides for privacy. */
  redacted?: string[]
}

export function parseRdapEntity(entity: Record<string, unknown>): ParsedRdapEntity {
  const result: ParsedRdapEntity = {}
  const redacted = new Set<string>()

  function take(label: string, value: string): string | undefined {
    if (REDACTED_VALUE.test(value)) {
      redacted.add(label)
      return undefined
    }
    return value
  }

  /** A redacted field must stay absent. An empty key would hide a value from a registrar answer. */
  function keep(target: ParsedRdapEntity, field: 'name' | 'abuseEmail' | 'abusePhone', value?: string): void {
    if (value) {
      target[field] = value
    }
  }

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
        keep(result, 'name', take('Name', val))
      }
      else if (fieldName === 'email' && typeof val === 'string' && !result.abuseEmail) {
        keep(result, 'abuseEmail', take('Abuse Email', val))
      }
      else if (fieldName === 'tel' && typeof val === 'string' && !result.abusePhone) {
        keep(result, 'abusePhone', take('Abuse Phone', val))
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
        for (const label of subParsed.redacted ?? [])
          redacted.add(label)
      }
    }
  }

  if (redacted.size > 0) {
    result.redacted = [...redacted]
  }

  return result
}

/**
 * Reads the redaction list of RFC 9537. It names the fields that the registry
 * removed or emptied, so the page can separate privacy from missing data.
 */
export function collectRedactedNames(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.redacted)) {
    return []
  }
  const names = new Set<string>()
  for (const item of data.redacted) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const name = (item as Record<string, unknown>).name as Record<string, unknown> | undefined
    const label = typeof name?.type === 'string'
      ? name.type
      : typeof name?.description === 'string' ? name.description : ''
    if (label) {
      names.add(label)
    }
  }
  return [...names]
}

export function parseRdapData(data: Record<string, unknown>, query: string, type: 'domain' | 'ip'): RdapLookupResult {
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

      const parsedTime = new Date(dateStr).getTime()
      if (Number.isNaN(parsedTime))
        continue

      const iso = new Date(parsedTime).toISOString()

      if (action === 'registration') {
        registrationDate = iso
      }
      else if (action === 'expiration') {
        expirationDate = iso
        const diffMs = parsedTime - Date.now()
        daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }
      else if (action === 'last changed' || action === 'last update of rdap database') {
        updatedDate = iso
      }
    }
  }

  // Extract Registrar
  let registrar: ParsedRdapEntity | undefined
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

  const redactedFields = new Set<string>(collectRedactedNames(data))
  for (const label of registrar?.redacted ?? []) {
    redactedFields.add(label)
  }

  return {
    query,
    type,
    found: true,
    status,
    redactedFields: [...redactedFields],
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

/**
 * Finds the registrar RDAP link in a payload. RFC 9083 gives it the relation
 * `related` and the media type `application/rdap+json`.
 */
export function findRelatedRdapLink(data: Record<string, unknown>): string | null {
  if (!Array.isArray(data.links)) {
    return null
  }
  for (const link of data.links) {
    if (!link || typeof link !== 'object') {
      continue
    }
    const item = link as Record<string, unknown>
    if (String(item.rel ?? '').toLowerCase() !== 'related') {
      continue
    }
    const href = typeof item.href === 'string' ? item.href : ''
    const mediaType = String(item.type ?? '').toLowerCase()
    if (!href.startsWith('https://') || (mediaType && !mediaType.includes('rdap'))) {
      continue
    }
    return href
  }
  return null
}

/** A thin registry keeps the domain record and gives the contact data to the registrar. */
export function isThinResult(result: RdapLookupResult): boolean {
  return !result.registrar?.name || !result.registrar?.abuseEmail
}

/** Adds registrar fields that the registry answer does not have. It changes no other field. */
function mergeRegistrar(target: RdapLookupResult, source: RdapLookupResult): void {
  const merged = { ...source.registrar, ...target.registrar }
  if (merged.name || merged.ianaId || merged.abuseEmail || merged.abusePhone) {
    target.registrar = merged
  }
  const fields = new Set([...(target.redactedFields ?? []), ...(source.redactedFields ?? [])])
  target.redactedFields = [...fields]
}

/**
 * Follows the registrar link of a thin registry answer. It stops after
 * `MAX_REFERRAL_HOPS` fetches, and it never reads the same URL twice.
 */
async function followRegistrarReferrals(
  result: RdapLookupResult,
  registryPayload: Record<string, unknown>,
  startUrl: string,
): Promise<void> {
  const visited = new Set<string>([startUrl])
  const referrals: string[] = []
  let payload = registryPayload

  for (let hop = 0; hop < MAX_REFERRAL_HOPS && isThinResult(result); hop++) {
    const href = findRelatedRdapLink(payload)
    if (!href || visited.has(href)) {
      break
    }
    visited.add(href)

    try {
      const safe = await assertSafeUrl(href)
      const res = await fetchRdap(safe.href)
      if (!res.ok) {
        break
      }
      payload = await res.json() as Record<string, unknown>
      mergeRegistrar(result, parseRdapData(payload, result.query, result.type))
      referrals.push(safe.href)
    }
    catch {
      // The registrar server is optional data. Keep the registry answer.
      break
    }
  }

  if (referrals.length > 0) {
    result.referrals = referrals
  }
}

export async function lookupRdap(rawQuery: string): Promise<RdapLookupResult> {
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
  const startedAt = Date.now()
  const source = () => ({
    server: targetUrl,
    queriedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
  })

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
        ...source(),
      }
    }

    if (!res.ok) {
      throw new Error(`RDAP query failed with status code ${res.status}.`)
    }

    const data = await res.json() as Record<string, unknown>
    const result: RdapLookupResult = { ...parseRdapData(data, clean, type), ...source() }

    if (type === 'domain') {
      await followRegistrarReferrals(result, data, targetUrl)
      result.durationMs = Date.now() - startedAt
    }

    return result
  }
  catch (cause) {
    if (isTimeout(cause)) {
      const server = new URL(targetUrl).host
      throw new Error(`RDAP request for ${clean} timed out.\n\nThe server ${server} did not answer twice. Try again in a moment.`, { cause })
    }
    throw cause
  }
}
