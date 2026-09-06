export type HealthLevel = 'ok' | 'info' | 'warning' | 'error'

export interface HealthIssue {
  level: HealthLevel
  code: string
  message: string
}

export type SpfQualifier = '+' | '-' | '~' | '?'

export interface SpfMechanism {
  qualifier: SpfQualifier
  type: string
  value?: string
  raw: string
}

export interface SpfReport {
  present: boolean
  raw: string[]
  version: string | null
  mechanisms: SpfMechanism[]
  issues: HealthIssue[]
}

export interface MxRecordInput {
  priority: number
  exchange: string
}

export interface MxEntry {
  priority: number
  exchange: string
  issues: HealthIssue[]
}

export interface MxReport {
  records: MxEntry[]
  issues: HealthIssue[]
}

export interface DkimSelectorInput {
  selector: string
  records: string[]
}

export interface DkimSelectorResult {
  selector: string
  present: boolean
  records: string[]
  issues: HealthIssue[]
}

export interface DkimReport {
  selectors: DkimSelectorResult[]
  issues: HealthIssue[]
}

export type DmarcPolicy = 'none' | 'quarantine' | 'reject'

export interface DmarcTag {
  name: string
  value: string
}

export interface DmarcReport {
  present: boolean
  raw: string[]
  version: string | null
  policy: DmarcPolicy | null
  subdomainPolicy: DmarcPolicy | null
  percent: number
  aggregateReportUris: string[]
  forensicReportUris: string[]
  tags: DmarcTag[]
  issues: HealthIssue[]
}

export interface EmailHealthResult {
  domain: string
  spf: SpfReport
  dkim: DkimReport
  dmarc: DmarcReport
  mx: MxReport
}

export const DEFAULT_DKIM_SELECTORS = [
  'default',
  'google',
  'selector1',
  'selector2',
  'k1'
] as const

const AUTHORIZING_TYPES = new Set(['a', 'mx', 'ip4', 'ip6', 'include', 'exists'])

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/
const IPV6_RE = /^[0-9a-f:]+$/i

function issue(level: HealthLevel, code: string, message: string): HealthIssue {
  return { level, code, message }
}

function parseQualifier(token: string): { qualifier: SpfQualifier, rest: string } {
  const first = token[0]
  if (first === '+' || first === '-' || first === '~' || first === '?') {
    return { qualifier: first, rest: token.slice(1) }
  }
  return { qualifier: '+', rest: token }
}

function parseMechanism(token: string): SpfMechanism | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  const { qualifier, rest } = parseQualifier(trimmed)
  if (!rest) {
    return null
  }

  const colon = rest.indexOf(':')
  const slash = rest.indexOf('/')
  let type: string
  let value: string | undefined

  if (colon >= 0) {
    type = rest.slice(0, colon).toLowerCase()
    value = rest.slice(colon + 1)
  } else if (slash >= 0) {
    type = rest.slice(0, slash).toLowerCase()
    value = rest.slice(slash)
  } else {
    type = rest.toLowerCase()
  }

  return { qualifier, type, value, raw: trimmed }
}

export function findSpfRecords(txtRecords: string[]): string[] {
  return txtRecords.filter((record) => {
    const value = record.trim().toLowerCase()
    return value.startsWith('v=spf1') || value.includes(' v=spf1')
  }).map(record => record.trim())
}

export function parseSpf(txtRecords: string[]): SpfReport {
  const raw = findSpfRecords(txtRecords)
  const issues: HealthIssue[] = []

  if (raw.length === 0) {
    issues.push(issue('error', 'spf-missing', 'No SPF record found.'))
    return {
      present: false,
      raw: [],
      version: null,
      mechanisms: [],
      issues
    }
  }

  if (raw.length > 1) {
    issues.push(issue('error', 'spf-multiple', 'Multiple SPF records found. Keep one SPF TXT record.'))
  }

  const record = raw[0]!
  const tokens = record.split(/\s+/).filter(Boolean)
  const versionToken = tokens[0]?.toLowerCase() ?? ''
  const version = versionToken.startsWith('v=') ? versionToken.slice(2) : null

  if (versionToken !== 'v=spf1') {
    issues.push(issue('error', 'spf-version', 'SPF record must start with v=spf1.'))
  }

  const mechanisms: SpfMechanism[] = []
  for (const token of tokens.slice(1)) {
    const mechanism = parseMechanism(token)
    if (mechanism) {
      mechanisms.push(mechanism)
    }
  }

  const allMechanisms = mechanisms.filter(item => item.type === 'all')
  const authorizing = mechanisms.filter(item => AUTHORIZING_TYPES.has(item.type))
  const redirects = mechanisms.filter(item => item.type === 'redirect')

  if (authorizing.length === 0 && redirects.length === 0) {
    issues.push(issue(
      'warning',
      'spf-no-permissions',
      'SPF has no authorizing mechanisms (a, mx, ip4, ip6, include, exists) or redirect.'
    ))
  }

  if (allMechanisms.length === 0 && redirects.length === 0) {
    issues.push(issue('warning', 'spf-no-all', 'SPF has no terminating all mechanism.'))
  }

  if (allMechanisms.length > 1) {
    issues.push(issue('warning', 'spf-multiple-all', 'SPF has more than one all mechanism.'))
  }

  const lastAll = allMechanisms[allMechanisms.length - 1]
  if (lastAll) {
    if (lastAll.qualifier === '+') {
      issues.push(issue('error', 'spf-plus-all', 'SPF uses +all. This permits any sender.'))
    } else if (lastAll.qualifier === '~') {
      issues.push(issue('warning', 'spf-softfail', 'SPF uses ~all (soft fail). Prefer -all for stricter policy.'))
    } else if (lastAll.qualifier === '?') {
      issues.push(issue('warning', 'spf-neutral-all', 'SPF uses ?all (neutral). Prefer -all for stricter policy.'))
    }
  }

  if (redirects.length > 0 && allMechanisms.length > 0) {
    issues.push(issue('warning', 'spf-redirect-with-all', 'SPF has both redirect and all. Redirect ignores later mechanisms.'))
  }

  for (const mechanism of mechanisms) {
    if (mechanism.type === 'ip4' && mechanism.value && !IPV4_RE.test(mechanism.value.split('/')[0]!)) {
      issues.push(issue('warning', 'spf-bad-ip4', `SPF ip4 value looks invalid: ${mechanism.value}`))
    }
    if (mechanism.type === 'ip6' && mechanism.value && !IPV6_RE.test(mechanism.value.split('/')[0]!)) {
      issues.push(issue('warning', 'spf-bad-ip6', `SPF ip6 value looks invalid: ${mechanism.value}`))
    }
    if (mechanism.type === 'include' && !mechanism.value) {
      issues.push(issue('error', 'spf-include-empty', 'SPF include mechanism is missing a domain.'))
    }
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'spf-ok', 'SPF record looks valid.'))
  }

  return {
    present: true,
    raw,
    version,
    mechanisms,
    issues
  }
}

const DMARC_POLICIES = new Set<DmarcPolicy>(['none', 'quarantine', 'reject'])

// RFC 7489 tags, plus np from RFC 9091.
const DMARC_TAGS = new Set([
  'v', 'p', 'sp', 'np', 'rua', 'ruf', 'adkim', 'aspf', 'ri', 'fo', 'rf', 'pct'
])

function isDmarcPolicy(value: string): value is DmarcPolicy {
  return DMARC_POLICIES.has(value as DmarcPolicy)
}

function parseReportUris(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value.split(',').map(item => item.trim()).filter(Boolean)
}

export function findDmarcRecords(txtRecords: string[]): string[] {
  return txtRecords
    .map(record => record.trim())
    .filter(record => record.toLowerCase().startsWith('v=dmarc1'))
}

/**
 * Parses the TXT records of _dmarc.<domain>.
 * DMARC tells the mailbox provider what to do when SPF and DKIM fail.
 */
export function parseDmarc(txtRecords: string[]): DmarcReport {
  const raw = findDmarcRecords(txtRecords)
  const issues: HealthIssue[] = []

  const empty: DmarcReport = {
    present: false,
    raw: [],
    version: null,
    policy: null,
    subdomainPolicy: null,
    // No record means that no policy applies to any mail.
    percent: 0,
    aggregateReportUris: [],
    forensicReportUris: [],
    tags: [],
    issues
  }

  if (raw.length === 0) {
    issues.push(issue(
      'error',
      'dmarc-missing',
      'No DMARC record found. Mailbox providers apply no policy when SPF or DKIM fails.'
    ))
    return empty
  }

  if (raw.length > 1) {
    issues.push(issue('error', 'dmarc-multiple', 'Multiple DMARC records found. Keep one DMARC TXT record.'))
  }

  const record = raw[0]!
  const tags: DmarcTag[] = []
  const values = new Map<string, string>()

  for (const part of record.split(';')) {
    const token = part.trim()
    if (!token) {
      continue
    }

    const equals = token.indexOf('=')
    if (equals < 0) {
      issues.push(issue('warning', 'dmarc-bad-tag', `DMARC tag has no value: ${token}`))
      continue
    }

    const name = token.slice(0, equals).trim().toLowerCase()
    const value = token.slice(equals + 1).trim()
    tags.push({ name, value })

    if (!DMARC_TAGS.has(name)) {
      issues.push(issue('warning', 'dmarc-unknown-tag', `DMARC has an unknown tag: ${name}`))
      continue
    }

    if (values.has(name)) {
      issues.push(issue('warning', 'dmarc-duplicate-tag', `DMARC tag ${name} appears more than once.`))
      continue
    }

    values.set(name, value)
  }

  const version = values.get('v') ?? null
  if (tags[0]?.name !== 'v') {
    issues.push(issue('error', 'dmarc-version-position', 'DMARC record must start with v=DMARC1.'))
  }

  const policyValue = (values.get('p') ?? '').toLowerCase()
  let policy: DmarcPolicy | null = null

  if (!policyValue) {
    issues.push(issue('error', 'dmarc-no-policy', 'DMARC has no p tag. The p tag is required.'))
  } else if (!isDmarcPolicy(policyValue)) {
    issues.push(issue('error', 'dmarc-bad-policy', `DMARC p tag is not valid: ${policyValue}`))
  } else {
    policy = policyValue
    if (policy === 'none') {
      issues.push(issue(
        'warning',
        'dmarc-policy-none',
        'DMARC uses p=none. This monitors only. Move to quarantine, then to reject.'
      ))
    } else if (policy === 'quarantine') {
      issues.push(issue(
        'info',
        'dmarc-policy-quarantine',
        'DMARC uses p=quarantine. Failed mail goes to the spam folder. Move to reject when the reports are clean.'
      ))
    }
  }

  const subdomainValue = (values.get('sp') ?? '').toLowerCase()
  let subdomainPolicy: DmarcPolicy | null = null

  if (subdomainValue) {
    if (isDmarcPolicy(subdomainValue)) {
      subdomainPolicy = subdomainValue
      if (subdomainValue === 'none' && policy && policy !== 'none') {
        issues.push(issue(
          'warning',
          'dmarc-subdomain-none',
          'DMARC uses sp=none. Subdomains have no policy.'
        ))
      }
    } else {
      issues.push(issue('error', 'dmarc-bad-subdomain-policy', `DMARC sp tag is not valid: ${subdomainValue}`))
    }
  }

  const percentValue = values.get('pct')
  let percent = 100

  if (percentValue !== undefined) {
    const parsed = Number(percentValue)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      issues.push(issue('error', 'dmarc-bad-pct', `DMARC pct tag must be a number from 0 to 100: ${percentValue}`))
    } else {
      percent = parsed
      if (parsed < 100) {
        issues.push(issue(
          'warning',
          'dmarc-partial-pct',
          `DMARC applies the policy to ${parsed}% of mail. Set pct=100 for full coverage.`
        ))
      }
    }
  }

  const aggregateReportUris = parseReportUris(values.get('rua'))
  const forensicReportUris = parseReportUris(values.get('ruf'))

  if (aggregateReportUris.length === 0) {
    issues.push(issue(
      'warning',
      'dmarc-no-rua',
      'DMARC has no rua tag. You get no aggregate reports, so you cannot see who sends mail for the domain.'
    ))
  }

  for (const uri of [...aggregateReportUris, ...forensicReportUris]) {
    if (!uri.toLowerCase().startsWith('mailto:')) {
      issues.push(issue('warning', 'dmarc-bad-report-uri', `DMARC report address must start with mailto: ${uri}`))
    }
  }

  for (const name of ['adkim', 'aspf'] as const) {
    const value = (values.get(name) ?? '').toLowerCase()
    if (value && value !== 'r' && value !== 's') {
      issues.push(issue('warning', `dmarc-bad-${name}`, `DMARC ${name} tag must be r or s: ${value}`))
    }
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'dmarc-ok', 'DMARC record looks valid.'))
  }

  return {
    present: true,
    raw,
    version,
    policy,
    subdomainPolicy,
    percent,
    aggregateReportUris,
    forensicReportUris,
    tags,
    issues
  }
}

export function analyzeMx(records: MxRecordInput[]): MxReport {
  const issues: HealthIssue[] = []

  if (records.length === 0) {
    issues.push(issue('error', 'mx-missing', 'No MX records found.'))
    return { records: [], issues }
  }

  const sorted = [...records]
    .map(record => ({
      priority: Number(record.priority),
      exchange: String(record.exchange ?? '').replace(/\.$/, '').toLowerCase()
    }))
    .sort((a, b) => a.priority - b.priority || a.exchange.localeCompare(b.exchange))

  const priorityCounts = new Map<number, number>()
  const exchangeCounts = new Map<string, number>()

  const entries: MxEntry[] = sorted.map((record) => {
    const entryIssues: HealthIssue[] = []

    if (!Number.isFinite(record.priority) || record.priority < 0) {
      entryIssues.push(issue('error', 'mx-bad-priority', 'MX priority must be a non-negative number.'))
    }

    if (!record.exchange) {
      entryIssues.push(issue('error', 'mx-empty-exchange', 'MX exchange is empty.'))
    } else if (IPV4_RE.test(record.exchange) || record.exchange.includes(':')) {
      entryIssues.push(issue('error', 'mx-ip-exchange', 'MX exchange must be a host name, not an IP address.'))
    } else if (
      record.exchange === 'localhost'
      || record.exchange.endsWith('.localhost')
      || record.exchange.endsWith('.local')
    ) {
      entryIssues.push(issue('warning', 'mx-local-exchange', 'MX exchange points to a local host name.'))
    }

    priorityCounts.set(record.priority, (priorityCounts.get(record.priority) ?? 0) + 1)
    if (record.exchange) {
      exchangeCounts.set(record.exchange, (exchangeCounts.get(record.exchange) ?? 0) + 1)
    }

    return {
      priority: record.priority,
      exchange: record.exchange,
      issues: entryIssues
    }
  })

  for (const [priority, count] of priorityCounts) {
    if (count > 1) {
      issues.push(issue(
        'warning',
        'mx-duplicate-priority',
        `Multiple MX records share priority ${priority}.`
      ))
    }
  }

  for (const [exchange, count] of exchangeCounts) {
    if (count > 1) {
      issues.push(issue(
        'warning',
        'mx-duplicate-exchange',
        `MX exchange ${exchange} appears more than once.`
      ))
    }
  }

  const hasEntryErrors = entries.some(entry => entry.issues.some(item => item.level === 'error'))
  if (!hasEntryErrors && issues.every(item => item.level !== 'error')) {
    if (issues.length === 0) {
      issues.push(issue('ok', 'mx-ok', 'MX records look valid.'))
    }
  }

  return { records: entries, issues }
}

export function analyzeDkim(inputs: DkimSelectorInput[]): DkimReport {
  const issues: HealthIssue[] = []
  const selectors: DkimSelectorResult[] = inputs.map(({ selector, records }) => {
    const name = selector.trim().toLowerCase()
    const entryIssues: HealthIssue[] = []
    const present = records.some((record) => {
      const value = record.trim().toLowerCase()
      return value.includes('v=dkim1') || value.includes('p=')
    })

    if (!name) {
      entryIssues.push(issue('error', 'dkim-empty-selector', 'DKIM selector is empty.'))
    } else if (!present) {
      entryIssues.push(issue('warning', 'dkim-missing', `No DKIM record for selector "${name}".`))
    } else {
      entryIssues.push(issue('ok', 'dkim-present', `DKIM record found for selector "${name}".`))
    }

    return {
      selector: name,
      present,
      records,
      issues: entryIssues
    }
  })

  const found = selectors.filter(item => item.present)
  if (selectors.length === 0) {
    issues.push(issue('info', 'dkim-no-selectors', 'No DKIM selectors were checked.'))
  } else if (found.length === 0) {
    issues.push(issue('warning', 'dkim-none-found', 'No DKIM records found for the checked selectors.'))
  } else {
    issues.push(issue(
      'ok',
      'dkim-ok',
      `Found DKIM for ${found.length} of ${selectors.length} selector${selectors.length === 1 ? '' : 's'}.`
    ))
  }

  return { selectors, issues }
}

export function normalizeDkimSelectors(input?: string[] | string): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[\s,]+/)
      : [...DEFAULT_DKIM_SELECTORS]

  const unique = new Set<string>()
  for (const value of values) {
    const selector = value.trim().toLowerCase().replace(/\.$/, '')
    if (selector) {
      unique.add(selector)
    }
  }

  if (unique.size === 0) {
    return [...DEFAULT_DKIM_SELECTORS]
  }

  return [...unique]
}

export function buildEmailHealthResult(input: {
  domain: string
  txtRecords: string[]
  dmarcRecords: string[]
  mxRecords: MxRecordInput[]
  dkim: DkimSelectorInput[]
}): EmailHealthResult {
  return {
    domain: input.domain,
    spf: parseSpf(input.txtRecords),
    mx: analyzeMx(input.mxRecords),
    dkim: analyzeDkim(input.dkim),
    dmarc: parseDmarc(input.dmarcRecords)
  }
}
