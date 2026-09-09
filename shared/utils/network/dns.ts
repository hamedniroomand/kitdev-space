export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'SOA' | 'TXT' | 'CAA'

/** The record types of one summary lookup. One request reads all of them. */
export const DNS_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SOA', 'TXT', 'CAA']

/** `ok` has records. `nodata` has none. `nxdomain` has no domain. `failed` has no answer. */
export type DnsAnswerStatus = 'ok' | 'nodata' | 'nxdomain' | 'failed'

export interface DnsRecordRow {
  type: DnsRecordType
  value: string
  /** The resolver gives a TTL for address records only. */
  ttl: number | null
}

export interface DnsAnswer {
  type: DnsRecordType
  status: DnsAnswerStatus
  message: string
  records: DnsRecordRow[]
}

export interface DnsSummary {
  domain: string
  /** The IP address of the resolver that answered. */
  resolver: string
  elapsedMs: number
  status: DnsAnswerStatus
  message: string
  answers: DnsAnswer[]
}

/** Error codes that mean the resolver found no answer for the name. */
const EMPTY_ANSWER_CODES = new Set(['ENOTFOUND', 'ENODATA', 'DNS_ENOTFOUND', 'DNS_ENODATA', 'NOTFOUND', 'NODATA'])

export function isDnsRecordType(value: string): value is DnsRecordType {
  return DNS_RECORD_TYPES.includes(value as DnsRecordType)
}

function quote(value: string): string {
  return `"${value}"`
}

export function formatCaaRecord(record: Record<string, unknown>): string {
  const flags = Number(record.critical ?? record.flags ?? 0)

  if (typeof record.tag === 'string') {
    return `${flags} ${record.tag} ${quote(String(record.value ?? ''))}`
  }

  for (const tag of ['issue', 'issuewild', 'iodef', 'contactemail', 'contactphone']) {
    const value = record[tag]
    if (typeof value === 'string') {
      return `${flags} ${tag} ${quote(value)}`
    }
  }

  return JSON.stringify(record)
}

export function formatSoaRecord(record: Record<string, unknown>): string {
  const fields = ['nsname', 'hostmaster', 'serial', 'refresh', 'retry', 'expire', 'minttl']
  return fields.map(field => String(record[field] ?? '')).join(' ').trim()
}

export function formatDnsRecord(record: string | object): string {
  if (typeof record === 'string') {
    return record
  }

  const value = record as Record<string, unknown>

  if (typeof value.priority === 'number' && typeof value.exchange === 'string') {
    // An empty exchange is the root name. A null MX record says the domain takes no mail.
    return `${value.priority} ${value.exchange || '.'}`
  }

  if ('critical' in value || 'tag' in value || 'issue' in value || 'issuewild' in value || 'iodef' in value) {
    return formatCaaRecord(value)
  }

  if ('nsname' in value && 'serial' in value) {
    return formatSoaRecord(value)
  }

  if (typeof value.address === 'string') {
    return value.address
  }

  return JSON.stringify(record)
}

function recordTtl(record: unknown): number | null {
  if (record && typeof record === 'object' && typeof (record as { ttl?: unknown }).ttl === 'number') {
    return (record as { ttl: number }).ttl
  }
  return null
}

/** Convert the raw resolver answer of one type to table rows. */
export function toDnsRows(type: DnsRecordType, raw: unknown[]): DnsRecordRow[] {
  return raw.map(record => ({
    type,
    value: formatDnsRecord(record as string | object),
    ttl: recordTtl(record),
  }))
}

export function isEmptyAnswerCode(code?: string | null): boolean {
  return !!code && EMPTY_ANSWER_CODES.has(code)
}

export function dnsAnswerMessage(type: DnsRecordType, status: DnsAnswerStatus): string {
  if (status === 'nxdomain') {
    return 'The domain does not exist.'
  }
  if (status === 'nodata') {
    return `The domain has no ${type} record.`
  }
  if (status === 'failed') {
    return `The ${type} lookup failed. The resolver gave an error.`
  }
  return ''
}

export function buildDnsAnswer(type: DnsRecordType, raw: unknown[] | null, code?: string | null): DnsAnswer {
  if (raw && raw.length) {
    return { type, status: 'ok', message: '', records: toDnsRows(type, raw) }
  }

  const status: DnsAnswerStatus = raw || isEmptyAnswerCode(code) ? 'nodata' : 'failed'
  return { type, status, message: dnsAnswerMessage(type, status), records: [] }
}

// ponytail: The resolver gives the same code for NXDOMAIN and for NODATA, so the
// summary reads NXDOMAIN from all eight answers. A domain that exists with none
// of these record types reads as NXDOMAIN. A raw DNS query gives the true code.
export function summaryStatus(answers: DnsAnswer[]): DnsAnswerStatus {
  if (answers.some(answer => answer.status === 'ok')) {
    return 'ok'
  }
  if (answers.every(answer => answer.status === 'failed')) {
    return 'failed'
  }
  if (answers.every(answer => answer.status === 'nodata')) {
    return 'nxdomain'
  }
  return 'nodata'
}

export function summaryMessage(domain: string, status: DnsAnswerStatus): string {
  if (status === 'nxdomain') {
    return `The domain ${domain} does not exist.`
  }
  if (status === 'failed') {
    return 'The resolver did not answer. Try again.'
  }
  if (status === 'nodata') {
    return `The domain ${domain} exists, but it has no record of these types.`
  }
  return ''
}

export function buildDnsSummary(input: {
  domain: string
  resolver: string
  elapsedMs: number
  answers: DnsAnswer[]
}): DnsSummary {
  const status = summaryStatus(input.answers)
  const answers = status === 'nxdomain'
    ? input.answers.map(answer => ({ ...answer, status: 'nxdomain' as const, message: dnsAnswerMessage(answer.type, 'nxdomain') }))
    : input.answers

  return {
    domain: input.domain,
    resolver: input.resolver,
    elapsedMs: input.elapsedMs,
    status,
    message: summaryMessage(input.domain, status),
    answers,
  }
}

export function dnsRecordRows(summary: DnsSummary | null): DnsRecordRow[] {
  return summary ? summary.answers.flatMap(answer => answer.records) : []
}

/** The `dig` command that gives the same answers. The tool runs no shell command. */
export function buildDigCommand(domain: string, types: DnsRecordType[] = DNS_RECORD_TYPES): string {
  const queries = types.map(type => `${domain} ${type}`).join(' ')
  return `dig +noall +answer ${queries}`
}
