const MAX_DOMAIN_LENGTH = 253

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'CAA'

export const DNS_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'CAA']

type MxRecord = { priority: number, exchange: string }

type BunDnsResolvers = typeof Bun.dns & {
  resolve: (hostname: string, rrtype?: string) => Promise<unknown>
  resolveCname: (hostname: string) => Promise<string[]>
  resolveMx: (hostname: string) => Promise<MxRecord[]>
  resolveNs: (hostname: string) => Promise<string[]>
  resolveTxt: (hostname: string) => Promise<string[][]>
  resolveCaa: (hostname: string) => Promise<object[]>
}

// Nitro prerender loads this module in Node. Read Bun.dns only when a lookup runs.
function bunDns(): BunDnsResolvers {
  return Bun.dns as BunDnsResolvers
}

export function isDnsRecordType(value: string): value is DnsRecordType {
  return DNS_RECORD_TYPES.includes(value as DnsRecordType)
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

function isNoData(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object' || !('code' in cause)) {
    return false
  }

  const code = String(cause.code)
  return code === 'DNS_ENOTFOUND' || code === 'ENOTFOUND' || code === 'ENODATA' || code === 'DNS_ENODATA'
}

async function resolveRecords(domain: string, type: DnsRecordType): Promise<string[] | object[]> {
  const dns = bunDns()

  switch (type) {
    case 'A':
      return addresses(await dns.resolve(domain, 'A'))
    case 'AAAA':
      return addresses(await dns.resolve(domain, 'AAAA'))
    case 'CNAME':
      return dns.resolveCname(domain)
    case 'MX':
      return dns.resolveMx(domain)
    case 'NS':
      return dns.resolveNs(domain)
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
    return await resolveRecords(host, type)
  } catch (cause) {
    if (isNoData(cause)) {
      return []
    }

    throw new Error('The lookup failed.', { cause })
  }
}
