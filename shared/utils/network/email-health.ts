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

export interface EmailHealthResult {
  domain: string
  spf: SpfReport
  dkim: DkimReport
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
  mxRecords: MxRecordInput[]
  dkim: DkimSelectorInput[]
}): EmailHealthResult {
  return {
    domain: input.domain,
    spf: parseSpf(input.txtRecords),
    mx: analyzeMx(input.mxRecords),
    dkim: analyzeDkim(input.dkim)
  }
}
