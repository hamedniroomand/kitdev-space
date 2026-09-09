import type { DnsRecordType, DnsSummary } from '#shared/utils/network/dns'
import { buildDnsAnswer, buildDnsSummary, DNS_RECORD_TYPES, isDnsRecordType } from '#shared/utils/network/dns'

const MAX_DOMAIN_LENGTH = 253

export type { DnsRecordType }
export { DNS_RECORD_TYPES, isDnsRecordType }

interface MxRecord { priority: number, exchange: string }

type BunDnsResolvers = typeof Bun.dns & {
  resolve: (hostname: string, rrtype?: string) => Promise<unknown>
  resolveCname: (hostname: string) => Promise<string[]>
  resolveMx: (hostname: string) => Promise<MxRecord[]>
  resolveNs: (hostname: string) => Promise<string[]>
  resolveSoa: (hostname: string) => Promise<object>
  resolveTxt: (hostname: string) => Promise<string[][]>
  resolveCaa: (hostname: string) => Promise<object[]>
  getServers: () => string[]
}

// Nitro prerender loads this module in Node. Read Bun.dns only when a lookup runs.
function bunDns(): BunDnsResolvers {
  return Bun.dns as BunDnsResolvers
}

export function normalizeDomain(input: string): string {
  const domain = input.trim()

  if (!domain) {
    throw new Error('Enter a domain.')
  }

  if (domain.length > MAX_DOMAIN_LENGTH) {
    throw new Error('The domain is too long.')
  }

  if (/\s/.test(domain)) {
    throw new Error('Enter a valid domain.')
  }

  if (/:\/\//.test(domain) || /[/?#]/.test(domain)) {
    throw new Error('Enter a domain, not a URL.')
  }

  return domain.replace(/\.+$/, '').toLowerCase()
}

function addresses(records: unknown): string[] {
  if (!Array.isArray(records)) {
    return []
  }

  return records.map((record) => {
    if (typeof record === 'string') {
      return record
    }

    if (record && typeof record === 'object' && 'address' in record) {
      return String((record as { address: string }).address)
    }

    return String(record)
  })
}

function errorCode(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'code' in cause) {
    return String((cause as { code: unknown }).code)
  }
  return ''
}

function isNoData(cause: unknown): boolean {
  const code = errorCode(cause)
  return code === 'DNS_ENOTFOUND' || code === 'ENOTFOUND' || code === 'ENODATA' || code === 'DNS_ENODATA'
}

/** The raw answer of the resolver. Address records keep the TTL of each record. */
async function resolveRaw(domain: string, type: DnsRecordType): Promise<unknown[]> {
  const dns = bunDns()

  switch (type) {
    case 'A':
    case 'AAAA': {
      const records = await dns.resolve(domain, type)
      return Array.isArray(records) ? records : []
    }
    case 'CNAME':
      return dns.resolveCname(domain)
    case 'MX':
      return dns.resolveMx(domain)
    case 'NS':
      return dns.resolveNs(domain)
    case 'SOA':
      return [await dns.resolveSoa(domain)]
    case 'TXT':
      return (await dns.resolveTxt(domain)).map(parts => parts.join(''))
    case 'CAA':
      return dns.resolveCaa(domain)
  }
}

export async function lookupDns(domain: string, type: DnsRecordType): Promise<string[] | object[]> {
  if (!isDnsRecordType(type)) {
    throw new Error('Choose a valid record type.')
  }

  const host = normalizeDomain(domain)

  try {
    const raw = await resolveRaw(host, type)
    return type === 'A' || type === 'AAAA' ? addresses(raw) : raw as string[] | object[]
  }
  catch (cause) {
    if (isNoData(cause)) {
      return []
    }

    throw new Error('The lookup failed.', { cause })
  }
}

/** The IP address of the resolver that answers the lookups of this server. */
export function resolverAddress(): string {
  try {
    const servers = bunDns().getServers?.()
    return servers?.[0] ?? 'system resolver'
  }
  catch {
    return 'system resolver'
  }
}

/** Read every common record type of a domain in one pass. */
export async function lookupAllDns(domain: string): Promise<DnsSummary> {
  const host = normalizeDomain(domain)
  const started = performance.now()

  const answers = await Promise.all(DNS_RECORD_TYPES.map(async (type) => {
    try {
      return buildDnsAnswer(type, await resolveRaw(host, type))
    }
    catch (cause) {
      return buildDnsAnswer(type, null, errorCode(cause))
    }
  }))

  return buildDnsSummary({
    domain: host,
    resolver: resolverAddress(),
    elapsedMs: Math.round(performance.now() - started),
    answers,
  })
}
