import { isIPv4, isIPv6 } from 'node:net'

const MAX_DOMAIN_LENGTH = 253
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
      if (!Array.isArray(v) || v.length < 4) continue
      const fieldName = String(v[0]).toLowerCase()
      const val = v[3]

      if (fieldName === 'fn' && typeof val === 'string' && !result.name) {
        result.name = val
      } else if (fieldName === 'email' && typeof val === 'string' && !result.abuseEmail) {
        result.abuseEmail = val
      } else if (fieldName === 'tel' && typeof val === 'string' && !result.abusePhone) {
        result.abusePhone = val
      }
    }
  }

  // Nested entities (e.g. abuse contact)
  if (Array.isArray(entity.entities)) {
    for (const sub of entity.entities) {
      if (sub && typeof sub === 'object') {
        const subParsed = parseRdapEntity(sub as Record<string, unknown>)
        if (!result.name && subParsed.name) result.name = subParsed.name
        if (!result.abuseEmail && subParsed.abuseEmail) result.abuseEmail = subParsed.abuseEmail
        if (!result.abusePhone && subParsed.abusePhone) result.abusePhone = subParsed.abusePhone
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
      if (!ev || typeof ev !== 'object') continue
      const action = String(ev.eventAction ?? '').toLowerCase()
      const dateStr = String(ev.eventDate ?? '')
      if (!dateStr) continue

      if (action === 'registration') {
        registrationDate = new Date(dateStr).toISOString()
      } else if (action === 'expiration') {
        expirationDate = new Date(dateStr).toISOString()
        const diffMs = new Date(dateStr).getTime() - Date.now()
        daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      } else if (action === 'last changed' || action === 'last update of rdap database') {
        updatedDate = new Date(dateStr).toISOString()
      }
    }
  }

  // Extract Registrar
  let registrar: RdapRegistrar | undefined
  if (Array.isArray(data.entities)) {
    // Find entity with role 'registrar' or 'registrant'
    const regEntity = data.entities.find((e) => {
      if (!e || typeof e !== 'object') return false
      const roles = Array.isArray(e.roles) ? e.roles : []
      return roles.includes('registrar') || roles.includes('registrant')
    }) as Record<string, unknown> | undefined

    if (regEntity) {
      registrar = parseRdapEntity(regEntity)
    } else if (data.entities.length > 0) {
      registrar = parseRdapEntity(data.entities[0] as Record<string, unknown>)
    }
  }

  // Extract Nameservers
  const nameservers: string[] = []
  if (Array.isArray(data.nameservers)) {
    for (const ns of data.nameservers) {
      if (ns && typeof ns === 'object') {
        const name = String(ns.ldhName || ns.handle || '').toLowerCase()
        if (name) nameservers.push(name)
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
    raw: data
  }
}

export async function lookupRdap(rawQuery: string): Promise<RdapResult> {
  const clean = rawQuery.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0]!
  if (!clean) {
    throw new Error('Enter a domain or IP address.')
  }

  const isIp = isIPv4(clean) || isIPv6(clean)
  const type: 'domain' | 'ip' = isIp ? 'ip' : 'domain'

  // The fetch target below is always rdap.org, so an SSRF check on `clean`
  // would guard a host this function never contacts. Validate the shape of the
  // query instead, so only a domain name or an IP address reaches the URL.
  if (!isIp) {
    assertDomainName(clean)
  }

  const targetUrl = isIp
    ? `https://rdap.org/ip/${encodeURIComponent(clean)}`
    : `https://rdap.org/domain/${encodeURIComponent(clean)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: 'application/rdap+json, application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timer)

    if (res.status === 404) {
      return {
        query: clean,
        type,
        found: false,
        status: ['available'],
        nameservers: [],
        raw: { message: 'Object does not exist or domain is available.' }
      }
    }

    if (!res.ok) {
      throw new Error(`RDAP query failed with status code ${res.status}.`)
    }

    const data = await res.json() as Record<string, unknown>
    return parseRdapData(data, clean, type)
  } catch (cause) {
    clearTimeout(timer)
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error(`RDAP request for ${clean} timed out.`, { cause })
    }
    throw cause
  }
}
