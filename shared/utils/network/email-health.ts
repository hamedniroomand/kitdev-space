export type HealthLevel = 'ok' | 'info' | 'warning' | 'error'

/**
 * The outcome of the DNS query that gave the records.
 * "failed" means that the resolver returned an error or timed out.
 * An empty answer is not a failure. It means that the record is absent.
 */
export type LookupStatus = 'ok' | 'failed'

export interface IssueDetails {
  /** The DNS string that the tool observed, or the name that it queried. */
  observed?: string
  /** The effect on email delivery. */
  impact?: string
  /** One step that corrects the issue. */
  fix?: string
}

export interface HealthIssue extends IssueDetails {
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

export type SpfTraceStatus = 'ok' | 'missing' | 'failed'
export type SpfTraceVia = 'root' | 'include' | 'redirect'

export interface SpfTraceNode {
  domain: string
  via: SpfTraceVia
  depth: number
  record: string | null
  status: SpfTraceStatus
  mechanisms: SpfMechanism[]
}

export interface SpfTraceCounters {
  lookupCount: number
  voidLookupCount: number
  exceeded: boolean
  /** Domains that the trace already visited, so it stopped. */
  loops: string[]
  /** Names whose DNS query returned an error. */
  failed: string[]
}

export interface SpfTrace extends SpfTraceCounters {
  lookupLimit: number
  voidLookupLimit: number
  nodes: SpfTraceNode[]
  /** Every IPv4 address and CIDR block that the SPF tree authorizes. */
  ipv4: string[]
  /** Every IPv6 address and CIDR block that the SPF tree authorizes. */
  ipv6: string[]
  issues: HealthIssue[]
}

export interface SpfReport {
  lookup?: LookupStatus
  present: boolean
  raw: string[]
  version: string | null
  mechanisms: SpfMechanism[]
  trace?: SpfTrace
  issues: HealthIssue[]
}

/** RFC 7208 section 4.6.4 permits 10 DNS lookups for one SPF check. */
export const SPF_LOOKUP_LIMIT = 10

/** RFC 7208 section 4.6.4 permits 2 void lookups for one SPF check. */
export const SPF_VOID_LOOKUP_LIMIT = 2

/** The mechanisms that spend one of the 10 DNS lookups. */
export const SPF_LOOKUP_TYPES = new Set(['a', 'mx', 'ptr', 'exists', 'include', 'redirect'])

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
  lookup?: LookupStatus
  records: MxEntry[]
  issues: HealthIssue[]
}

export interface DkimTag {
  name: string
  value: string
}

export interface DkimKey {
  version: string | null
  /** The key type: rsa or ed25519. The default of RFC 6376 is rsa. */
  keyType: string
  /** The base64 public key of the p tag. An empty value means a revoked key. */
  publicKey: string
  /** The RSA modulus size in bits, or null when the tool cannot read the key. */
  keyBits: number | null
  /** The values of the t tag, such as y for test mode. */
  flags: string[]
  revoked: boolean
  testing: boolean
  tags: DkimTag[]
}

export interface DkimSelectorInput {
  selector: string
  records: string[]
  lookup?: LookupStatus
  /** The CNAME target when the selector points at a third-party key. */
  cname?: string | null
}

export interface DkimSelectorResult {
  selector: string
  present: boolean
  records: string[]
  lookup?: LookupStatus
  cname?: string | null
  key?: DkimKey | null
  issues: HealthIssue[]
}

export interface KnownDkimSelector {
  selector: string
  provider: string
}

export interface DkimReport {
  selectors: DkimSelectorResult[]
  /** The selectors that the tool queried. */
  tested: string[]
  /** The common selectors that the tool did not query, and their provider. */
  skipped: KnownDkimSelector[]
  issues: HealthIssue[]
}

export type DmarcPolicy = 'none' | 'quarantine' | 'reject'

export interface DmarcTag {
  name: string
  value: string
}

export interface DmarcReport {
  lookup?: LookupStatus
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

export type MailPolicyKind = 'mta-sts' | 'tls-rpt' | 'bimi'

export interface RecordTag {
  name: string
  value: string
}

export interface MailPolicyReport {
  kind: MailPolicyKind
  /** The DNS name that the tool queried. */
  name: string
  present: boolean
  lookup?: LookupStatus
  raw: string[]
  tags: RecordTag[]
  issues: HealthIssue[]
}

export type EmailGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface ScoreLine {
  label: string
  points: number
  max: number
  detail: string
}

export interface EmailScore {
  points: number
  max: number
  percent: number
  grade: EmailGrade
  lines: ScoreLine[]
}

export interface EmailHealthResult {
  domain: string
  spf: SpfReport
  dkim: DkimReport
  dmarc: DmarcReport
  mx: MxReport
  mtaSts?: MailPolicyReport
  tlsRpt?: MailPolicyReport
  bimi?: MailPolicyReport
  score?: EmailScore
}

export const MAIL_POLICY_NAMES: Record<MailPolicyKind, (domain: string) => string> = {
  'mta-sts': domain => `_mta-sts.${domain}`,
  'tls-rpt': domain => `_smtp._tls.${domain}`,
  'bimi': domain => `default._bimi.${domain}`,
}

export interface ReportContext {
  domain?: string
  /** The outcome of the DNS query. The default is "ok". */
  lookup?: LookupStatus
}

/**
 * Builds the issue for a DNS query that failed.
 * A failed query is not proof that a record is absent, so the level stays a
 * warning. The tool must not mark the domain invalid.
 */
function lookupFailure(code: string, name: string | undefined, subject: string): HealthIssue {
  return issue('warning', code, `The DNS query for the ${subject} record failed. The record status is unknown.`, {
    observed: `${name ?? 'the record'}: the resolver returned an error`,
    impact: 'The tool cannot tell if the record is absent or if the resolver is unavailable. This result says nothing about the domain.',
    fix: 'Run the tool again. If the query fails again, check the name servers of the domain.',
  })
}

/**
 * Common selectors of well known mail providers.
 * The tool queries only the selectors that the user chooses, plus the default
 * list. It does not try every name in this list.
 */
export const KNOWN_DKIM_SELECTORS: KnownDkimSelector[] = [
  { selector: 'default', provider: 'Generic' },
  { selector: 'google', provider: 'Google Workspace' },
  { selector: 'selector1', provider: 'Microsoft 365' },
  { selector: 'selector2', provider: 'Microsoft 365' },
  { selector: 'k1', provider: 'Mailchimp and Mandrill' },
  { selector: 'k2', provider: 'Mailchimp and Mandrill' },
  { selector: 's1', provider: 'SendGrid and Zendesk' },
  { selector: 's2', provider: 'SendGrid and Zendesk' },
  { selector: 'mail', provider: 'Generic' },
  { selector: 'dkim', provider: 'Fastmail' },
  { selector: 'zmail', provider: 'Zoho Mail' },
  { selector: 'protonmail', provider: 'Proton Mail' },
]

export const DEFAULT_DKIM_SELECTORS = [
  'default',
  'google',
  'selector1',
  'selector2',
  'k1',
] as const

/** The key size that NIST and the large mailbox providers ask for. */
export const MIN_DKIM_KEY_BITS = 1024
export const RECOMMENDED_DKIM_KEY_BITS = 2048

const AUTHORIZING_TYPES = new Set(['a', 'mx', 'ip4', 'ip6', 'include', 'exists'])

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/
const IPV6_RE = /^[0-9a-f:]+$/i

function issue(level: HealthLevel, code: string, message: string, details: IssueDetails = {}): HealthIssue {
  return { level, code, message, ...details }
}

function queriedName(type: string, name: string | undefined): string {
  return name ? `${type} ${name}: no matching record` : `${type} lookup: no matching record`
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
  const equals = rest.indexOf('=')
  const slash = rest.indexOf('/')
  let type: string
  let value: string | undefined

  if (colon >= 0) {
    type = rest.slice(0, colon).toLowerCase()
    value = rest.slice(colon + 1)
  }
  else if (equals >= 0) {
    type = rest.slice(0, equals).toLowerCase()
    value = rest.slice(equals + 1)
  }
  else if (slash >= 0) {
    type = rest.slice(0, slash).toLowerCase()
    value = rest.slice(slash)
  }
  else {
    type = rest.toLowerCase()
  }

  return { qualifier, type, value, raw: trimmed }
}

export function parseSpfMechanisms(record: string): SpfMechanism[] {
  const mechanisms: SpfMechanism[] = []
  for (const token of record.split(/\s+/).filter(Boolean).slice(1)) {
    const mechanism = parseMechanism(token)
    if (mechanism) {
      mechanisms.push(mechanism)
    }
  }
  return mechanisms
}

export function findSpfRecords(txtRecords: string[]): string[] {
  return txtRecords.filter((record) => {
    const value = record.trim().toLowerCase()
    return value.startsWith('v=spf1') || value.includes(' v=spf1')
  }).map(record => record.trim())
}

export function parseSpf(txtRecords: string[], context: ReportContext = {}): SpfReport {
  const raw = findSpfRecords(txtRecords)
  const issues: HealthIssue[] = []
  const lookup: LookupStatus = context.lookup ?? 'ok'

  if (lookup === 'failed') {
    issues.push(lookupFailure('spf-lookup-failed', context.domain ? `TXT ${context.domain}` : undefined, 'SPF'))
    return { lookup, present: false, raw: [], version: null, mechanisms: [], issues }
  }

  if (raw.length === 0) {
    issues.push(issue('error', 'spf-missing', 'No SPF record found.', {
      observed: queriedName('TXT', context.domain),
      impact: 'A receiver cannot tell which servers can send for the domain. More mail goes to the spam folder, and DMARC cannot pass through SPF.',
      fix: `Publish one TXT record on ${context.domain ?? 'the domain'} that starts with v=spf1 and lists each sender. Example: v=spf1 include:_spf.example.net -all`,
    }))
    return {
      lookup,
      present: false,
      raw: [],
      version: null,
      mechanisms: [],
      issues,
    }
  }

  if (raw.length > 1) {
    issues.push(issue('error', 'spf-multiple', 'Multiple SPF records found. Keep one SPF TXT record.', {
      observed: raw.join(' | '),
      impact: 'RFC 7208 makes SPF fail permanently when a domain has more than one SPF record. Every SPF check then fails.',
      fix: 'Merge the mechanisms into one TXT record. Delete the other SPF records.',
    }))
  }

  const record = raw[0]!
  const tokens = record.split(/\s+/).filter(Boolean)
  const versionToken = tokens[0]?.toLowerCase() ?? ''
  const version = versionToken.startsWith('v=') ? versionToken.slice(2) : null

  if (versionToken !== 'v=spf1') {
    issues.push(issue('error', 'spf-version', 'SPF record must start with v=spf1.', {
      observed: record,
      impact: 'A receiver ignores the record. The domain then has no SPF policy.',
      fix: 'Move v=spf1 to the start of the record.',
    }))
  }

  const mechanisms = parseSpfMechanisms(record)

  const allMechanisms = mechanisms.filter(item => item.type === 'all')
  const authorizing = mechanisms.filter(item => AUTHORIZING_TYPES.has(item.type))
  const redirects = mechanisms.filter(item => item.type === 'redirect')

  if (authorizing.length === 0 && redirects.length === 0) {
    issues.push(issue(
      'warning',
      'spf-no-permissions',
      'SPF has no authorizing mechanisms (a, mx, ip4, ip6, include, exists) or redirect.',
      {
        observed: record,
        impact: 'SPF fails for every server. Mail that you send can go to the spam folder or bounce.',
        fix: 'Add one mechanism for each sender, such as include:_spf.example.net or ip4:203.0.113.0/24.',
      },
    ))
  }

  if (allMechanisms.length === 0 && redirects.length === 0) {
    issues.push(issue('warning', 'spf-no-all', 'SPF has no terminating all mechanism.', {
      observed: record,
      impact: 'A server that is not listed gets a neutral result. A receiver applies no SPF policy to it.',
      fix: 'Add -all at the end of the record.',
    }))
  }

  if (allMechanisms.length > 1) {
    issues.push(issue('warning', 'spf-multiple-all', 'SPF has more than one all mechanism.', {
      observed: allMechanisms.map(item => item.raw).join(' '),
      impact: 'A receiver stops at the first all mechanism. The later mechanisms have no effect.',
      fix: 'Keep one all mechanism at the end of the record.',
    }))
  }

  const lastAll = allMechanisms[allMechanisms.length - 1]
  if (lastAll) {
    if (lastAll.qualifier === '+') {
      issues.push(issue('error', 'spf-plus-all', 'SPF uses +all. This permits any sender.', {
        observed: lastAll.raw,
        impact: 'Any server on the internet passes SPF for the domain. A sender can spoof the domain.',
        fix: 'Replace +all with -all.',
      }))
    }
    else if (lastAll.qualifier === '~') {
      issues.push(issue('warning', 'spf-softfail', 'SPF uses ~all (soft fail). Prefer -all for stricter policy.', {
        observed: lastAll.raw,
        impact: 'A receiver accepts mail from a server that is not listed, and only marks it.',
        fix: 'Change ~all to -all after you confirm that the record lists every sender.',
      }))
    }
    else if (lastAll.qualifier === '?') {
      issues.push(issue('warning', 'spf-neutral-all', 'SPF uses ?all (neutral). Prefer -all for stricter policy.', {
        observed: lastAll.raw,
        impact: 'A neutral result gives no protection. A receiver treats the mail as if the domain has no SPF record.',
        fix: 'Change ?all to -all after you confirm that the record lists every sender.',
      }))
    }
  }

  if (redirects.length > 0 && allMechanisms.length > 0) {
    issues.push(issue('warning', 'spf-redirect-with-all', 'SPF has both redirect and all. Redirect ignores later mechanisms.', {
      observed: [...redirects, ...allMechanisms].map(item => item.raw).join(' '),
      impact: 'The all mechanism wins and the redirect never runs. The policy of the other domain does not apply.',
      fix: 'Delete the all mechanism, or delete the redirect modifier.',
    }))
  }

  for (const mechanism of mechanisms) {
    if (mechanism.type === 'ip4' && mechanism.value && !IPV4_RE.test(mechanism.value.split('/')[0]!)) {
      issues.push(issue('warning', 'spf-bad-ip4', `SPF ip4 value looks invalid: ${mechanism.value}`, {
        observed: mechanism.raw,
        impact: 'A receiver can reject the full record as a syntax error. Every SPF check then fails.',
        fix: 'Write the value as an IPv4 address or a CIDR block, such as ip4:203.0.113.0/24.',
      }))
    }
    if (mechanism.type === 'ip6' && mechanism.value && !IPV6_RE.test(mechanism.value.split('/')[0]!)) {
      issues.push(issue('warning', 'spf-bad-ip6', `SPF ip6 value looks invalid: ${mechanism.value}`, {
        observed: mechanism.raw,
        impact: 'A receiver can reject the full record as a syntax error. Every SPF check then fails.',
        fix: 'Write the value as an IPv6 address or a CIDR block, such as ip6:2001:db8::/32.',
      }))
    }
    if (mechanism.type === 'include' && !mechanism.value) {
      issues.push(issue('error', 'spf-include-empty', 'SPF include mechanism is missing a domain.', {
        observed: mechanism.raw,
        impact: 'The record has a syntax error. SPF fails permanently for the domain.',
        fix: 'Write the mechanism as include:<domain>, or delete it.',
      }))
    }
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'spf-ok', 'SPF record looks valid.', { observed: record }))
  }

  return {
    lookup,
    present: true,
    raw,
    version,
    mechanisms,
    issues,
  }
}

/**
 * Builds the issues of an SPF trace from the counters.
 * The trace itself runs on the server, because it needs DNS.
 */
export function buildSpfTraceIssues(counters: SpfTraceCounters): HealthIssue[] {
  const issues: HealthIssue[] = []

  if (counters.exceeded) {
    issues.push(issue(
      'error',
      'spf-lookup-limit',
      `SPF needs more than ${SPF_LOOKUP_LIMIT} DNS lookups.`,
      {
        observed: `${counters.lookupCount} of ${SPF_LOOKUP_LIMIT} DNS lookups used, and the tree is not complete`,
        impact: `RFC 7208 permits ${SPF_LOOKUP_LIMIT} lookups. A receiver returns permerror and the SPF check fails for every message.`,
        fix: 'Delete an include that you do not use, or replace one include with the ip4 and ip6 blocks of that sender.',
      },
    ))
  }

  if (counters.voidLookupCount > SPF_VOID_LOOKUP_LIMIT) {
    issues.push(issue(
      'warning',
      'spf-void-limit',
      `SPF has ${counters.voidLookupCount} void lookups. RFC 7208 permits ${SPF_VOID_LOOKUP_LIMIT}.`,
      {
        observed: `${counters.voidLookupCount} of ${SPF_VOID_LOOKUP_LIMIT} void lookups`,
        impact: 'A receiver can return permerror. The SPF check then fails for every message.',
        fix: 'Delete each mechanism that points at a name with no record.',
      },
    ))
  }

  if (counters.loops.length > 0) {
    issues.push(issue('warning', 'spf-trace-loop', 'The SPF tree points back to a domain that it already used.', {
      observed: counters.loops.join(', '),
      impact: 'The repeated branch adds lookups and gives no new sender.',
      fix: 'Delete the include that repeats the domain.',
    }))
  }

  if (counters.failed.length > 0) {
    issues.push(issue('warning', 'spf-trace-failed', 'One or more DNS queries in the SPF tree failed.', {
      observed: counters.failed.join(', '),
      impact: 'The tool cannot read the full tree. The flattened list can be incomplete.',
      fix: 'Run the tool again. If a query fails again, check the name servers of that domain.',
    }))
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'spf-trace-ok', `The SPF tree uses ${counters.lookupCount} of ${SPF_LOOKUP_LIMIT} DNS lookups.`, {
      observed: `${counters.lookupCount} of ${SPF_LOOKUP_LIMIT} DNS lookups, ${counters.voidLookupCount} of ${SPF_VOID_LOOKUP_LIMIT} void lookups`,
    }))
  }

  return issues
}

const DMARC_POLICIES = new Set<DmarcPolicy>(['none', 'quarantine', 'reject'])

// RFC 7489 tags, plus np from RFC 9091.
const DMARC_TAGS = new Set([
  'v',
  'p',
  'sp',
  'np',
  'rua',
  'ruf',
  'adkim',
  'aspf',
  'ri',
  'fo',
  'rf',
  'pct',
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
export function parseDmarc(txtRecords: string[], context: ReportContext = {}): DmarcReport {
  const raw = findDmarcRecords(txtRecords)
  const issues: HealthIssue[] = []
  const dmarcName = context.domain ? `_dmarc.${context.domain}` : undefined
  const lookup: LookupStatus = context.lookup ?? 'ok'

  const empty: DmarcReport = {
    lookup,
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
    issues,
  }

  if (lookup === 'failed') {
    issues.push(lookupFailure('dmarc-lookup-failed', dmarcName, 'DMARC'))
    return empty
  }

  if (raw.length === 0) {
    issues.push(issue(
      'error',
      'dmarc-missing',
      'No DMARC record found. Mailbox providers apply no policy when SPF or DKIM fails.',
      {
        observed: queriedName('TXT', dmarcName),
        impact: 'A receiver accepts spoofed mail that fails SPF and DKIM. You get no reports about who sends mail for the domain.',
        fix: `Publish a TXT record at ${dmarcName ?? '_dmarc.<domain>'} with the value: v=DMARC1; p=none; rua=mailto:dmarc@<domain>. Then move the policy to quarantine and to reject.`,
      },
    ))
    return empty
  }

  if (raw.length > 1) {
    issues.push(issue('error', 'dmarc-multiple', 'Multiple DMARC records found. Keep one DMARC TXT record.', {
      observed: raw.join(' | '),
      impact: 'A receiver ignores all the records. The domain then has no DMARC policy.',
      fix: 'Delete the extra TXT records and keep one DMARC record.',
    }))
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
      issues.push(issue('warning', 'dmarc-bad-tag', `DMARC tag has no value: ${token}`, {
        observed: token,
        impact: 'A receiver can stop at the syntax error and ignore the record.',
        fix: `Write the tag as name=value, or delete "${token}".`,
      }))
      continue
    }

    const name = token.slice(0, equals).trim().toLowerCase()
    const value = token.slice(equals + 1).trim()
    tags.push({ name, value })

    if (!DMARC_TAGS.has(name)) {
      issues.push(issue('warning', 'dmarc-unknown-tag', `DMARC has an unknown tag: ${name}`, {
        observed: token,
        impact: 'A receiver ignores the tag. The tag can hide a spelling error in a tag that you need.',
        fix: `Delete ${name}, or correct the spelling.`,
      }))
      continue
    }

    if (values.has(name)) {
      issues.push(issue('warning', 'dmarc-duplicate-tag', `DMARC tag ${name} appears more than once.`, {
        observed: token,
        impact: 'A receiver can use the first value or reject the record.',
        fix: `Keep one ${name} tag in the record.`,
      }))
      continue
    }

    values.set(name, value)
  }

  const version = values.get('v') ?? null
  if (tags[0]?.name !== 'v') {
    issues.push(issue('error', 'dmarc-version-position', 'DMARC record must start with v=DMARC1.', {
      observed: record,
      impact: 'A receiver ignores the record. The domain then has no DMARC policy.',
      fix: 'Move v=DMARC1 to the start of the record.',
    }))
  }

  const policyValue = (values.get('p') ?? '').toLowerCase()
  let policy: DmarcPolicy | null = null

  if (!policyValue) {
    issues.push(issue('error', 'dmarc-no-policy', 'DMARC has no p tag. The p tag is required.', {
      observed: record,
      impact: 'A receiver ignores the record. Spoofed mail that fails SPF and DKIM still gets delivered.',
      fix: 'Add p=none to the record, then move to p=quarantine and p=reject.',
    }))
  }
  else if (!isDmarcPolicy(policyValue)) {
    issues.push(issue('error', 'dmarc-bad-policy', `DMARC p tag is not valid: ${policyValue}`, {
      observed: `p=${policyValue}`,
      impact: 'A receiver ignores the record. The domain then has no DMARC policy.',
      fix: 'Set p to none, quarantine, or reject.',
    }))
  }
  else {
    policy = policyValue
    if (policy === 'none') {
      issues.push(issue(
        'warning',
        'dmarc-policy-none',
        'DMARC uses p=none. This monitors only. Move to quarantine, then to reject.',
        {
          observed: 'p=none',
          impact: 'A receiver delivers spoofed mail that fails SPF and DKIM. You get reports, but you get no protection.',
          fix: 'Read the aggregate reports. When each of your senders passes, set p=quarantine, then p=reject.',
        },
      ))
    }
    else if (policy === 'quarantine') {
      issues.push(issue(
        'info',
        'dmarc-policy-quarantine',
        'DMARC uses p=quarantine. Failed mail goes to the spam folder. Move to reject when the reports are clean.',
        {
          observed: 'p=quarantine',
          impact: 'A receiver moves spoofed mail to the spam folder, but still delivers it.',
          fix: 'Set p=reject after the aggregate reports show that each of your senders passes.',
        },
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
          'DMARC uses sp=none. Subdomains have no policy.',
          {
            observed: 'sp=none',
            impact: 'A sender can spoof any subdomain of the domain. The policy of the parent domain does not apply.',
            fix: `Delete the sp tag, or set sp=${policy}.`,
          },
        ))
      }
    }
    else {
      issues.push(issue('error', 'dmarc-bad-subdomain-policy', `DMARC sp tag is not valid: ${subdomainValue}`, {
        observed: `sp=${subdomainValue}`,
        impact: 'A receiver can ignore the full record. The domain then has no DMARC policy.',
        fix: 'Set sp to none, quarantine, or reject.',
      }))
    }
  }

  const percentValue = values.get('pct')
  let percent = 100

  if (percentValue !== undefined) {
    const parsed = Number(percentValue)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      issues.push(issue('error', 'dmarc-bad-pct', `DMARC pct tag must be a number from 0 to 100: ${percentValue}`, {
        observed: `pct=${percentValue}`,
        impact: 'A receiver can ignore the full record. The domain then has no DMARC policy.',
        fix: 'Set pct to a whole number from 0 to 100, or delete the tag.',
      }))
    }
    else {
      percent = parsed
      if (parsed < 100) {
        issues.push(issue(
          'warning',
          'dmarc-partial-pct',
          `DMARC applies the policy to ${parsed}% of mail. Set pct=100 for full coverage.`,
          {
            observed: `pct=${parsed}`,
            impact: `A receiver applies the policy to ${parsed}% of failed mail. It delivers the rest.`,
            fix: 'Set pct=100, or delete the tag. The default value is 100.',
          },
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
      'DMARC has no rua tag. You get no aggregate reports, so you cannot see who sends mail for the domain.',
      {
        observed: record,
        impact: 'You cannot see which senders fail SPF and DKIM. A stricter policy can then stop your own mail.',
        fix: 'Add rua=mailto:dmarc@<domain> to the record.',
      },
    ))
  }

  for (const uri of [...aggregateReportUris, ...forensicReportUris]) {
    if (!uri.toLowerCase().startsWith('mailto:')) {
      issues.push(issue('warning', 'dmarc-bad-report-uri', `DMARC report address must start with mailto: ${uri}`, {
        observed: uri,
        impact: 'A receiver skips the address and sends no reports to it.',
        fix: `Write the address as mailto:${uri.replace(/^mailto:/i, '')}`,
      }))
    }
  }

  for (const name of ['adkim', 'aspf'] as const) {
    const value = (values.get(name) ?? '').toLowerCase()
    if (value && value !== 'r' && value !== 's') {
      issues.push(issue('warning', `dmarc-bad-${name}`, `DMARC ${name} tag must be r or s: ${value}`, {
        observed: `${name}=${value}`,
        impact: 'A receiver uses the default relaxed alignment and ignores the tag.',
        fix: `Set ${name}=r for relaxed alignment, or ${name}=s for strict alignment.`,
      }))
    }
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'dmarc-ok', 'DMARC record looks valid.', { observed: record }))
  }

  return {
    lookup,
    present: true,
    raw,
    version,
    policy,
    subdomainPolicy,
    percent,
    aggregateReportUris,
    forensicReportUris,
    tags,
    issues,
  }
}

export function analyzeMx(records: MxRecordInput[], context: ReportContext = {}): MxReport {
  const issues: HealthIssue[] = []
  const lookup: LookupStatus = context.lookup ?? 'ok'

  if (lookup === 'failed') {
    issues.push(lookupFailure('mx-lookup-failed', context.domain ? `MX ${context.domain}` : undefined, 'MX'))
    return { lookup, records: [], issues }
  }

  if (records.length === 0) {
    issues.push(issue('error', 'mx-missing', 'No MX records found.', {
      observed: queriedName('MX', context.domain),
      impact: 'The domain accepts no mail. A sender gets a bounce message.',
      fix: `Publish an MX record on ${context.domain ?? 'the domain'} that points to the host name of your mail provider.`,
    }))
    return { lookup, records: [], issues }
  }

  const sorted = [...records]
    .map(record => ({
      priority: Number(record.priority),
      exchange: String(record.exchange ?? '').replace(/\.$/, '').toLowerCase(),
    }))
    .sort((a, b) => a.priority - b.priority || a.exchange.localeCompare(b.exchange))

  const priorityCounts = new Map<number, number>()
  const exchangeCounts = new Map<string, number>()

  const entries: MxEntry[] = sorted.map((record) => {
    const entryIssues: HealthIssue[] = []
    const observed = `${record.priority} ${record.exchange}`

    if (!Number.isFinite(record.priority) || record.priority < 0) {
      entryIssues.push(issue('error', 'mx-bad-priority', 'MX priority must be a non-negative number.', {
        observed,
        impact: 'A sender can fail to read the record and cannot deliver mail to the domain.',
        fix: 'Set the priority to a whole number from 0 to 65535.',
      }))
    }

    if (!record.exchange) {
      entryIssues.push(issue('error', 'mx-empty-exchange', 'MX exchange is empty.', {
        observed,
        impact: 'A sender has no host to connect to. Mail to the domain bounces.',
        fix: 'Set the exchange to the host name of your mail server.',
      }))
    }
    else if (IPV4_RE.test(record.exchange) || record.exchange.includes(':')) {
      entryIssues.push(issue('error', 'mx-ip-exchange', 'MX exchange must be a host name, not an IP address.', {
        observed,
        impact: 'RFC 5321 does not permit an IP address here. Many senders reject the record and the mail bounces.',
        fix: 'Publish an A record for a host name, then point the MX record at that host name.',
      }))
    }
    else if (
      record.exchange === 'localhost'
      || record.exchange.endsWith('.localhost')
      || record.exchange.endsWith('.local')
    ) {
      entryIssues.push(issue('warning', 'mx-local-exchange', 'MX exchange points to a local host name.', {
        observed,
        impact: 'A sender on the internet cannot resolve the host. Mail to the domain bounces.',
        fix: 'Point the MX record at a public host name.',
      }))
    }

    priorityCounts.set(record.priority, (priorityCounts.get(record.priority) ?? 0) + 1)
    if (record.exchange) {
      exchangeCounts.set(record.exchange, (exchangeCounts.get(record.exchange) ?? 0) + 1)
    }

    return {
      priority: record.priority,
      exchange: record.exchange,
      issues: entryIssues,
    }
  })

  for (const [priority, count] of priorityCounts) {
    if (count > 1) {
      issues.push(issue(
        'warning',
        'mx-duplicate-priority',
        `Multiple MX records share priority ${priority}.`,
        {
          observed: sorted.filter(row => row.priority === priority).map(row => `${row.priority} ${row.exchange}`).join(' | '),
          impact: 'A sender picks one host at random. This is correct for load sharing, and wrong when you want a backup host.',
          fix: 'Give the backup host a higher priority number, or keep the equal numbers when you want load sharing.',
        },
      ))
    }
  }

  for (const [exchange, count] of exchangeCounts) {
    if (count > 1) {
      issues.push(issue(
        'warning',
        'mx-duplicate-exchange',
        `MX exchange ${exchange} appears more than once.`,
        {
          observed: sorted.filter(row => row.exchange === exchange).map(row => `${row.priority} ${row.exchange}`).join(' | '),
          impact: 'The extra record adds no path for mail. It makes the zone harder to read.',
          fix: `Keep one MX record for ${exchange}.`,
        },
      ))
    }
  }

  const hasEntryErrors = entries.some(entry => entry.issues.some(item => item.level === 'error'))
  if (!hasEntryErrors && issues.every(item => item.level !== 'error')) {
    if (issues.length === 0) {
      issues.push(issue('ok', 'mx-ok', 'MX records look valid.', {
        observed: entries.map(row => `${row.priority} ${row.exchange}`).join(' | '),
      }))
    }
  }

  return { lookup, records: entries, issues }
}

/** Builds the issues for one parsed DKIM key. */
function describeDkimKey(name: string, dkimName: string, key: DkimKey, records: string[]): HealthIssue[] {
  const observed = records.join(' | ')
  const issues: HealthIssue[] = []

  if (key.revoked) {
    issues.push(issue('error', 'dkim-revoked', `The key of selector "${name}" is revoked. The p tag is empty.`, {
      observed,
      impact: 'A receiver treats every signature from this selector as a failure. RFC 6376 asks a receiver to reject the signature.',
      fix: `Publish a new key at ${dkimName}, or delete the record when the selector is no longer in use.`,
    }))
    return issues
  }

  if (key.testing) {
    issues.push(issue('warning', 'dkim-testing', `Selector "${name}" is in test mode (t=y).`, {
      observed: `t=${key.flags.join(':')}`,
      impact: 'A receiver must treat a signed message as unsigned. The key gives no protection.',
      fix: 'Delete the t=y tag after you confirm that the signature passes.',
    }))
  }

  if (key.keyType === 'rsa' && key.keyBits === null) {
    issues.push(issue('warning', 'dkim-bad-key', `The tool cannot read the public key of selector "${name}".`, {
      observed,
      impact: 'A receiver can also fail to read the key. Every signature from this selector then fails.',
      fix: 'Publish the full base64 value of the p tag in one TXT record.',
    }))
  }
  else if (key.keyBits !== null && key.keyBits < MIN_DKIM_KEY_BITS) {
    issues.push(issue('error', 'dkim-key-too-small', `The key of selector "${name}" is ${key.keyBits} bits.`, {
      observed: `k=${key.keyType}, ${key.keyBits} bits`,
      impact: `A key below ${MIN_DKIM_KEY_BITS} bits is weak. Many receivers refuse the signature.`,
      fix: `Ask your mail provider for a ${RECOMMENDED_DKIM_KEY_BITS} bit key.`,
    }))
  }
  else if (key.keyBits !== null && key.keyBits < RECOMMENDED_DKIM_KEY_BITS) {
    issues.push(issue('warning', 'dkim-key-small', `The key of selector "${name}" is ${key.keyBits} bits.`, {
      observed: `k=${key.keyType}, ${key.keyBits} bits`,
      impact: `A ${key.keyBits} bit key is weaker than the ${RECOMMENDED_DKIM_KEY_BITS} bit key that the large mailbox providers ask for.`,
      fix: `Ask your mail provider for a ${RECOMMENDED_DKIM_KEY_BITS} bit key, then publish the new selector.`,
    }))
  }

  if (issues.length === 0) {
    issues.push(issue('ok', 'dkim-present', `DKIM record found for selector "${name}".`, {
      observed: key.keyBits === null ? observed : `k=${key.keyType}, ${key.keyBits} bits`,
    }))
  }

  return issues
}

export function analyzeDkim(inputs: DkimSelectorInput[], context: ReportContext = {}): DkimReport {
  const issues: HealthIssue[] = []
  const selectors: DkimSelectorResult[] = inputs.map(({ selector, records, lookup = 'ok', cname = null }) => {
    const name = selector.trim().toLowerCase()
    const dkimName = `${name}._domainkey.${context.domain ?? '<domain>'}`
    const entryIssues: HealthIssue[] = []
    const key = lookup === 'ok'
      ? records.map(record => parseDkimRecord(record)).find(item => item !== null) ?? null
      : null
    const present = key !== null

    if (lookup === 'failed') {
      entryIssues.push(lookupFailure('dkim-lookup-failed', dkimName, 'DKIM'))
    }
    else if (!name) {
      entryIssues.push(issue('error', 'dkim-empty-selector', 'DKIM selector is empty.', {
        observed: '(empty selector)',
        impact: 'The tool cannot query a record for the selector.',
        fix: 'Enter the selector name that your mail provider gives you.',
      }))
    }
    else if (!present) {
      entryIssues.push(issue('warning', 'dkim-missing', `No DKIM record for selector "${name}".`, {
        observed: queriedName('TXT', dkimName),
        impact: 'Mail that is signed with this selector fails DKIM. It can go to the spam folder when DMARC also has no SPF pass.',
        fix: `Publish the TXT record that your mail provider gives you at ${dkimName}, or check the selector name in the DKIM-Signature header of a sent message.`,
      }))
    }
    else {
      entryIssues.push(...describeDkimKey(name, dkimName, key!, records))
    }

    return {
      selector: name,
      present,
      records,
      lookup,
      cname,
      key,
      issues: entryIssues,
    }
  })

  const found = selectors.filter(item => item.present)
  const failed = selectors.filter(item => item.lookup === 'failed')

  if (failed.length === selectors.length && selectors.length > 0) {
    issues.push(lookupFailure('dkim-lookup-failed', 'each DKIM selector', 'DKIM'))
  }
  else if (selectors.length === 0) {
    issues.push(issue('info', 'dkim-no-selectors', 'No DKIM selectors were checked.', {
      observed: '(no selector given)',
      impact: 'The report shows no DKIM status for the domain.',
      fix: 'Enter one or more selectors, then run the tool again.',
    }))
  }
  else if (found.length === 0) {
    issues.push(issue('warning', 'dkim-none-found', 'No DKIM records found for the checked selectors.', {
      observed: selectors.map(item => `${item.selector}._domainkey.${context.domain ?? '<domain>'}`).join(' | '),
      impact: 'A receiver cannot check the signature of your mail. DMARC then depends on SPF alone.',
      fix: 'Read the DKIM-Signature header of a message that the domain sent. Copy the s= value and check that selector.',
    }))
  }
  else {
    issues.push(issue(
      'ok',
      'dkim-ok',
      `Found DKIM for ${found.length} of ${selectors.length} selector${selectors.length === 1 ? '' : 's'}.`,
      { observed: found.map(item => item.selector).join(', ') },
    ))
  }

  const tested = selectors.map(item => item.selector).filter(Boolean)
  const skipped = KNOWN_DKIM_SELECTORS.filter(known => !tested.includes(known.selector))

  // The page lists the skipped selectors as data. One note explains the limit.
  issues.push(issue('info', 'dkim-enumeration', 'A DKIM selector cannot be listed from DNS.', {
    observed: `Checked: ${tested.join(', ') || 'none'}. Not checked: ${skipped.map(item => item.selector).join(', ') || 'none'}`,
    impact: 'DNS gives no way to list the names below _domainkey. A selector is a free label, so no tool can find every selector of a domain.',
    fix: 'Read the s= tag in the DKIM-Signature header of a message that the domain sent. That tag holds the selector name.',
  }))

  return { selectors, tested, skipped, issues }
}

function decodeBase64(value: string): Uint8Array | null {
  const text = value.replace(/\s+/g, '')
  if (!text) {
    return null
  }
  try {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }
  catch {
    return null
  }
}

interface DerField { start: number, end: number, next: number }

function readDerField(bytes: Uint8Array, offset: number, tag: number): DerField | null {
  if (bytes[offset] !== tag) {
    return null
  }

  const first = bytes[offset + 1]
  if (first === undefined) {
    return null
  }

  let length = first
  let start = offset + 2

  if (first >= 0x80) {
    const count = first & 0x7F
    if (count === 0 || count > 4) {
      return null
    }
    length = 0
    for (let index = 0; index < count; index += 1) {
      const byte = bytes[offset + 2 + index]
      if (byte === undefined) {
        return null
      }
      length = (length * 256) + byte
    }
    start = offset + 2 + count
  }

  const end = start + length
  if (end > bytes.length) {
    return null
  }

  return { start, end, next: end }
}

/**
 * Reads the RSA modulus size of a DKIM public key.
 * The p tag holds a SubjectPublicKeyInfo structure in base64.
 * The function gives null when the value is truncated or is not RSA.
 */
export function rsaKeyBits(publicKey: string): number | null {
  const bytes = decodeBase64(publicKey)
  if (!bytes) {
    return null
  }

  const outer = readDerField(bytes, 0, 0x30)
  if (!outer) {
    return null
  }

  const algorithm = readDerField(bytes, outer.start, 0x30)
  if (!algorithm) {
    return null
  }

  const bitString = readDerField(bytes, algorithm.next, 0x03)
  if (!bitString) {
    return null
  }

  // The first byte of a BIT STRING counts the unused bits.
  const keySequence = readDerField(bytes, bitString.start + 1, 0x30)
  if (!keySequence) {
    return null
  }

  const modulus = readDerField(bytes, keySequence.start, 0x02)
  if (!modulus) {
    return null
  }

  let start = modulus.start
  while (start < modulus.end && bytes[start] === 0) {
    start += 1
  }

  const lead = bytes[start]
  if (lead === undefined) {
    return null
  }

  return ((modulus.end - start - 1) * 8) + (32 - Math.clz32(lead))
}

/**
 * Parses a DKIM TXT record. RFC 6376 section 3.6.1 gives the tags.
 * An empty p tag means that the owner revoked the key.
 */
export function parseDkimRecord(record: string): DkimKey | null {
  const text = record.trim()
  if (!text) {
    return null
  }

  const tags: DkimTag[] = []
  const values = new Map<string, string>()

  for (const part of text.split(';')) {
    const token = part.trim()
    if (!token) {
      continue
    }
    const equals = token.indexOf('=')
    if (equals < 0) {
      continue
    }
    const name = token.slice(0, equals).trim().toLowerCase()
    const value = token.slice(equals + 1).trim()
    tags.push({ name, value })
    if (!values.has(name)) {
      values.set(name, value)
    }
  }

  if (!values.has('p') && (values.get('v') ?? '').toLowerCase() !== 'dkim1') {
    return null
  }

  const publicKey = (values.get('p') ?? '').replace(/\s+/g, '')
  const keyType = (values.get('k') ?? 'rsa').toLowerCase()
  const flags = (values.get('t') ?? '').split(':').map(item => item.trim().toLowerCase()).filter(Boolean)

  const keyBits = publicKey && keyType === 'rsa'
    ? rsaKeyBits(publicKey)
    : publicKey && keyType === 'ed25519'
      ? 256
      : null

  return {
    version: values.get('v') ?? null,
    keyType,
    publicKey,
    keyBits,
    flags,
    revoked: values.has('p') && publicKey === '',
    testing: flags.includes('y'),
    tags,
  }
}

const DKIM_SELECTOR_RE = /^[a-z0-9](?:[\w-]{0,61}[a-z0-9])?$/i
const MAX_DKIM_SELECTORS = 10

export function normalizeDkimSelectors(input?: string[] | string): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[\s,]+/)
      : [...DEFAULT_DKIM_SELECTORS]

  const unique = new Set<string>()
  for (const value of values) {
    const selector = value.trim().toLowerCase().replace(/\.$/, '')
    if (selector && DKIM_SELECTOR_RE.test(selector)) {
      unique.add(selector)
      if (unique.size >= MAX_DKIM_SELECTORS) {
        break
      }
    }
  }

  if (unique.size === 0) {
    return [...DEFAULT_DKIM_SELECTORS]
  }

  return [...unique]
}

function parseRecordTags(record: string): RecordTag[] {
  const tags: RecordTag[] = []
  for (const part of record.split(';')) {
    const token = part.trim()
    if (!token) {
      continue
    }
    const equals = token.indexOf('=')
    if (equals < 0) {
      continue
    }
    tags.push({ name: token.slice(0, equals).trim().toLowerCase(), value: token.slice(equals + 1).trim() })
  }
  return tags
}

function tagValue(tags: RecordTag[], name: string): string | undefined {
  return tags.find(tag => tag.name === name)?.value
}

interface MailPolicySpec {
  kind: MailPolicyKind
  version: string
  title: string
  missingImpact: string
  missingFix: string
}

const MAIL_POLICY_SPECS: Record<MailPolicyKind, MailPolicySpec> = {
  'mta-sts': {
    kind: 'mta-sts',
    version: 'stsv1',
    title: 'MTA-STS',
    missingImpact: 'A sender can fall back to plain SMTP when the TLS handshake fails. An attacker in the path can then read the mail.',
    missingFix: 'Publish a TXT record with v=STSv1; id=<value>, then serve the policy file at https://mta-sts.<domain>/.well-known/mta-sts.txt',
  },
  'tls-rpt': {
    kind: 'tls-rpt',
    version: 'tlsrptv1',
    title: 'SMTP TLS Reporting',
    missingImpact: 'You get no report when a sender cannot make a TLS connection to your mail servers.',
    missingFix: 'Publish a TXT record with v=TLSRPTv1; rua=mailto:tlsrpt@<domain>',
  },
  'bimi': {
    kind: 'bimi',
    version: 'bimi1',
    title: 'BIMI',
    missingImpact: 'A mailbox provider shows no brand logo next to your messages. This has no effect on delivery.',
    missingFix: 'Publish a TXT record with v=BIMI1; l=<https URL of an SVG logo>. BIMI needs a DMARC policy of quarantine or reject.',
  },
}

/**
 * Parses one modern mail policy TXT record.
 * The tool reads DNS only. It does not fetch the MTA-STS policy file over
 * HTTPS and it does not send test messages.
 */
export function parseMailPolicy(
  kind: MailPolicyKind,
  txtRecords: string[],
  context: ReportContext = {},
): MailPolicyReport {
  const spec = MAIL_POLICY_SPECS[kind]
  const name = MAIL_POLICY_NAMES[kind](context.domain ?? '<domain>')
  const lookup: LookupStatus = context.lookup ?? 'ok'
  const issues: HealthIssue[] = []

  if (lookup === 'failed') {
    issues.push(lookupFailure(`${kind}-lookup-failed`, name, spec.title))
    return { kind, name, present: false, lookup, raw: [], tags: [], issues }
  }

  const raw = txtRecords
    .map(record => record.trim())
    .filter(record => record.toLowerCase().startsWith(`v=${spec.version}`))

  if (raw.length === 0) {
    issues.push(issue(kind === 'bimi' ? 'info' : 'warning', `${kind}-missing`, `No ${spec.title} record found.`, {
      observed: queriedName('TXT', name),
      impact: spec.missingImpact,
      fix: spec.missingFix,
    }))
    return { kind, name, present: false, lookup, raw: [], tags: [], issues }
  }

  const record = raw[0]!
  const tags = parseRecordTags(record)

  if (raw.length > 1) {
    issues.push(issue('warning', `${kind}-multiple`, `More than one ${spec.title} record found.`, {
      observed: raw.join(' | '),
      impact: 'A receiver can ignore all the records.',
      fix: `Keep one ${spec.title} TXT record.`,
    }))
  }

  if (kind === 'mta-sts' && !tagValue(tags, 'id')) {
    issues.push(issue('warning', 'mta-sts-no-id', 'The MTA-STS record has no id tag.', {
      observed: record,
      impact: 'A sender cannot tell when the policy file changes. It can keep an old policy.',
      fix: 'Add id=<value> to the record. Change the value each time that you change the policy file.',
    }))
  }

  if (kind === 'tls-rpt' && !tagValue(tags, 'rua')) {
    issues.push(issue('warning', 'tls-rpt-no-rua', 'The TLS report record has no rua tag.', {
      observed: record,
      impact: 'You get no TLS report, because the record gives no address.',
      fix: 'Add rua=mailto:tlsrpt@<domain> to the record.',
    }))
  }

  if (kind === 'bimi') {
    const logo = tagValue(tags, 'l') ?? ''
    if (!logo) {
      issues.push(issue('info', 'bimi-no-logo', 'The BIMI record has no l tag.', {
        observed: record,
        impact: 'A mailbox provider has no logo to show.',
        fix: 'Add l=<https URL of an SVG logo> to the record.',
      }))
    }
    else if (!logo.toLowerCase().startsWith('https://')) {
      issues.push(issue('warning', 'bimi-insecure-logo', 'The BIMI logo URL does not use HTTPS.', {
        observed: `l=${logo}`,
        impact: 'A mailbox provider refuses a logo that is not on HTTPS.',
        fix: 'Move the logo to an HTTPS URL.',
      }))
    }
  }

  if (issues.length === 0) {
    issues.push(issue('ok', `${kind}-ok`, `${spec.title} record found.`, { observed: record }))
  }

  return { kind, name, present: true, lookup, raw, tags, issues }
}

function scoreLine(label: string, points: number, max: number, detail: string): ScoreLine {
  return { label, points, max, detail }
}

const SKIPPED_DETAIL = 'The DNS query failed. This check is not scored.'

function policyLine(label: string, report: MailPolicyReport | undefined, max: number): ScoreLine {
  if (!report) {
    return scoreLine(label, 0, 0, 'The tool did not check this record.')
  }
  if (report.lookup === 'failed') {
    return scoreLine(label, 0, 0, SKIPPED_DETAIL)
  }
  return report.present
    ? scoreLine(label, max, max, `${report.name} has a record.`)
    : scoreLine(label, 0, max, `${report.name} has no record.`)
}

function grade(percent: number): EmailGrade {
  if (percent >= 90) {
    return 'A'
  }
  if (percent >= 80) {
    return 'B'
  }
  if (percent >= 70) {
    return 'C'
  }
  if (percent >= 60) {
    return 'D'
  }
  return 'F'
}

/**
 * Adds the points of each check and gives a grade.
 * The grade rates the DNS records only. It does not predict inbox placement.
 * A check whose DNS query failed adds no points and lowers the maximum, so a
 * resolver error cannot lower the grade.
 */
export function scoreEmailHealth(result: EmailHealthResult): EmailScore {
  const lines: ScoreLine[] = []
  const { spf, dkim, dmarc, mx } = result

  if (spf.lookup === 'failed') {
    lines.push(scoreLine('SPF record', 0, 0, SKIPPED_DETAIL))
  }
  else {
    lines.push(spf.present
      ? scoreLine('SPF record', 10, 10, 'The domain has one SPF record.')
      : scoreLine('SPF record', 0, 10, 'The domain has no SPF record.'))

    const qualifier = spf.mechanisms.filter(item => item.type === 'all').pop()?.qualifier
    const policyPoints = qualifier === '-' ? 10 : qualifier === '~' ? 6 : qualifier === '?' ? 2 : 0
    lines.push(scoreLine(
      'SPF policy',
      spf.present ? policyPoints : 0,
      10,
      qualifier ? `The record ends with ${qualifier}all.` : 'The record has no all mechanism.',
    ))

    const trace = spf.trace
    const withinLimits = !trace || (!trace.exceeded && trace.voidLookupCount <= trace.voidLookupLimit)
    lines.push(scoreLine(
      'SPF lookup budget',
      spf.present && withinLimits ? 5 : 0,
      5,
      trace ? `The tree uses ${trace.lookupCount} of ${trace.lookupLimit} DNS lookups.` : 'The tool did not trace the tree.',
    ))
  }

  const checkedSelectors = dkim.selectors.filter(item => item.lookup !== 'failed')
  if (dkim.selectors.length > 0 && checkedSelectors.length === 0) {
    lines.push(scoreLine('DKIM key', 0, 0, SKIPPED_DETAIL))
  }
  else {
    const live = checkedSelectors.flatMap(item => (item.key && !item.key.revoked ? [item.key] : []))
    lines.push(live.length > 0
      ? scoreLine('DKIM key', 12, 12, `${live.length} selector${live.length === 1 ? '' : 's'} publish a key.`)
      : scoreLine('DKIM key', 0, 12, 'No checked selector publishes a live key.'))

    const bits = live.map(key => key.keyBits ?? 0)
    const smallest = bits.length > 0 ? Math.min(...bits) : 0
    const strengthPoints = smallest >= RECOMMENDED_DKIM_KEY_BITS ? 8 : smallest >= MIN_DKIM_KEY_BITS ? 4 : 0
    lines.push(scoreLine(
      'DKIM key strength',
      strengthPoints,
      8,
      smallest > 0 ? `The smallest key is ${smallest} bits.` : 'The tool read no key size.',
    ))
  }

  if (dmarc.lookup === 'failed') {
    lines.push(scoreLine('DMARC record', 0, 0, SKIPPED_DETAIL))
  }
  else {
    lines.push(dmarc.present
      ? scoreLine('DMARC record', 10, 10, 'The domain has one DMARC record.')
      : scoreLine('DMARC record', 0, 10, 'The domain has no DMARC record.'))

    const policyPoints = dmarc.policy === 'reject' ? 20 : dmarc.policy === 'quarantine' ? 12 : dmarc.policy === 'none' ? 4 : 0
    lines.push(scoreLine('DMARC policy', policyPoints, 20, dmarc.policy ? `The policy is p=${dmarc.policy}.` : 'The record has no p tag.'))

    lines.push(dmarc.aggregateReportUris.length > 0
      ? scoreLine('DMARC reports', 5, 5, 'The record has a rua address.')
      : scoreLine('DMARC reports', 0, 5, 'The record has no rua address.'))
  }

  if (mx.lookup === 'failed') {
    lines.push(scoreLine('MX records', 0, 0, SKIPPED_DETAIL))
  }
  else {
    const hasErrors = mx.records.some(row => row.issues.some(item => item.level === 'error'))
    lines.push(mx.records.length > 0 && !hasErrors
      ? scoreLine('MX records', 10, 10, `The domain has ${mx.records.length} MX record${mx.records.length === 1 ? '' : 's'}.`)
      : scoreLine('MX records', 0, 10, mx.records.length === 0 ? 'The domain has no MX record.' : 'One or more MX records have an error.'))
  }

  lines.push(policyLine('MTA-STS', result.mtaSts, 4))
  lines.push(policyLine('SMTP TLS Reporting', result.tlsRpt, 3))
  lines.push(policyLine('BIMI', result.bimi, 3))

  const points = lines.reduce((total, line) => total + line.points, 0)
  const max = lines.reduce((total, line) => total + line.max, 0)
  const percent = max > 0 ? Math.round((points / max) * 100) : 0

  return { points, max, percent, grade: grade(percent), lines }
}

export interface EmailHealthLookups {
  txt?: LookupStatus
  dmarc?: LookupStatus
  mx?: LookupStatus
}

export function buildEmailHealthResult(input: {
  domain: string
  txtRecords: string[]
  dmarcRecords: string[]
  mxRecords: MxRecordInput[]
  dkim: DkimSelectorInput[]
  lookups?: EmailHealthLookups
}): EmailHealthResult {
  const { domain } = input
  const lookups = input.lookups ?? {}

  return {
    domain,
    spf: parseSpf(input.txtRecords, { domain, lookup: lookups.txt }),
    mx: analyzeMx(input.mxRecords, { domain, lookup: lookups.mx }),
    dkim: analyzeDkim(input.dkim, { domain }),
    dmarc: parseDmarc(input.dmarcRecords, { domain, lookup: lookups.dmarc }),
  }
}
