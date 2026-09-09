export type FindingLevel = 'ok' | 'info' | 'warning' | 'error'

export type FindingSeverity = 'critical' | 'warning' | 'info' | 'pass'

export interface FindingGroup {
  severity: FindingSeverity
  label: string
  findings: SecurityFinding[]
}

export interface SecurityFinding {
  id: string
  level: FindingLevel
  header: string
  title: string
  detail: string
  fix: string | null
  present: boolean
  value: string | null
}

export interface CorsReport {
  allowOrigin: string | null
  allowMethods: string | null
  allowHeaders: string | null
  allowCredentials: string | null
  exposeHeaders: string | null
  maxAge: string | null
  findings: SecurityFinding[]
}

export interface SecurityHeaderReport {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  findings: SecurityFinding[]
  cors: CorsReport
}

const SEVERITY_BY_LEVEL: Record<FindingLevel, FindingSeverity> = {
  error: 'critical',
  warning: 'warning',
  info: 'info',
  ok: 'pass',
}

const SEVERITY_LABELS: { severity: FindingSeverity, label: string }[] = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'warning', label: 'Warning' },
  { severity: 'info', label: 'Info' },
  { severity: 'pass', label: 'Pass' },
]

export function severityOf(level: FindingLevel): FindingSeverity {
  return SEVERITY_BY_LEVEL[level]
}

/** Group the findings by severity. The most severe group comes first. */
export function groupFindingsBySeverity(findings: SecurityFinding[]): FindingGroup[] {
  return SEVERITY_LABELS
    .map(({ severity, label }) => ({
      severity,
      label,
      findings: findings.filter(item => severityOf(item.level) === severity),
    }))
    .filter(group => group.findings.length > 0)
}

function header(headers: Record<string, string>, name: string): string | null {
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      const trimmed = value.trim()
      return trimmed || null
    }
  }
  return null
}

function finding(
  partial: Omit<SecurityFinding, 'present' | 'value'> & {
    present?: boolean
    value?: string | null
  },
): SecurityFinding {
  return {
    id: partial.id,
    level: partial.level,
    header: partial.header,
    title: partial.title,
    detail: partial.detail,
    fix: partial.fix,
    present: partial.present ?? false,
    value: partial.value ?? null,
  }
}

/**
 * Checks that report a fact, not a defect. They stay out of the score, so a
 * site that misses an optional modern header can still reach grade A.
 */
const UNSCORED_FINDINGS = new Set([
  'cors-origin-echo',
  'permissions-policy',
  'coop',
  'coep',
  'corp',
  'hsts-preload',
  'cache-control',
])

/** Split a Content Security Policy into its directives. */
export function parseCsp(value: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {}

  for (const part of value.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean)
    const name = tokens.shift()?.toLowerCase()
    if (name) {
      directives[name] = tokens.map(token => token.toLowerCase())
    }
  }

  return directives
}

function scoreFromFindings(findings: SecurityFinding[]): number {
  const scored = findings.filter(item => !UNSCORED_FINDINGS.has(item.id))
  if (scored.length === 0) {
    return 100
  }

  let points = 0
  let max = 0

  for (const item of scored) {
    const weight = item.level === 'error' ? 3 : item.level === 'warning' ? 2 : 1
    max += weight * 10
    if (item.level === 'ok') {
      points += weight * 10
    }
    else if (item.level === 'info') {
      points += weight * 7
    }
    else if (item.level === 'warning') {
      points += weight * 4
    }
  }

  return Math.round((points / max) * 100)
}

function gradeFromScore(score: number): SecurityHeaderReport['grade'] {
  if (score >= 90) {
    return 'A'
  }
  if (score >= 75) {
    return 'B'
  }
  if (score >= 60) {
    return 'C'
  }
  if (score >= 40) {
    return 'D'
  }
  return 'F'
}

/** Methods that a browser sends with no preflight. */
const SAFELISTED_METHODS = new Set(['GET', 'HEAD', 'POST'])

export interface SecurityHeaderOptions {
  requestOrigin?: string | null
  /** The method in Access-Control-Request-Method of the preflight. */
  requestMethod?: string | null
  /** The status of the OPTIONS preflight response. */
  preflightStatus?: number | null
}

/** Headers that isolate a page or limit a browser feature. Each one is optional. */
const ISOLATION_CHECKS: {
  id: string
  header: string
  okValues: string[]
  okTitle: string
  missing: string
  fix: string
}[] = [
  {
    id: 'permissions-policy',
    header: 'Permissions-Policy',
    okValues: [],
    okTitle: 'Permissions-Policy is set',
    missing: 'The page keeps the browser default for camera, microphone, geolocation, and the other features.',
    fix: 'Add Permissions-Policy and turn off each feature that the page does not use, such as camera=(), microphone=(), geolocation=().',
  },
  {
    id: 'coop',
    header: 'Cross-Origin-Opener-Policy',
    okValues: ['same-origin', 'same-origin-allow-popups', 'noopener-allow-popups'],
    okTitle: 'Cross-Origin-Opener-Policy isolates the browsing context',
    missing: 'Another document can keep a window reference to this page.',
    fix: 'Add Cross-Origin-Opener-Policy: same-origin.',
  },
  {
    id: 'coep',
    header: 'Cross-Origin-Embedder-Policy',
    okValues: ['require-corp', 'credentialless'],
    okTitle: 'Cross-Origin-Embedder-Policy is set',
    missing: 'The page cannot use the APIs that need cross-origin isolation, such as SharedArrayBuffer.',
    fix: 'Add Cross-Origin-Embedder-Policy: require-corp when the page needs cross-origin isolation.',
  },
  {
    id: 'corp',
    header: 'Cross-Origin-Resource-Policy',
    okValues: ['same-origin', 'same-site', 'cross-origin'],
    okTitle: 'Cross-Origin-Resource-Policy is set',
    missing: 'Another site can embed this response as a resource.',
    fix: 'Add Cross-Origin-Resource-Policy: same-origin, or cross-origin for a public asset.',
  },
]

const PRELOAD_MAX_AGE = 31_536_000

function firstToken(value: string): string {
  return value.split(/[;,]/)[0]?.trim().toLowerCase() ?? ''
}

function hstsPreloadFinding(hsts: string): SecurityFinding {
  const seconds = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0)
  const missing: string[] = []

  if (seconds < PRELOAD_MAX_AGE) {
    missing.push(`max-age is ${seconds}, and the preload list needs ${PRELOAD_MAX_AGE}`)
  }
  if (!/includesubdomains/i.test(hsts)) {
    missing.push('includeSubDomains is absent')
  }
  if (!/preload/i.test(hsts)) {
    missing.push('the preload token is absent')
  }

  return finding({
    id: 'hsts-preload',
    level: missing.length === 0 ? 'ok' : 'info',
    header: 'Strict-Transport-Security',
    title: missing.length === 0
      ? 'HSTS meets the preload requirements'
      : 'HSTS does not meet the preload requirements',
    detail: missing.length === 0
      ? hsts
      : `${missing.join('. ')}.`,
    fix: missing.length === 0
      ? null
      : `Set max-age=${PRELOAD_MAX_AGE}; includeSubDomains; preload, then submit the domain at hstspreload.org.`,
    present: true,
    value: hsts,
  })
}

function serverDisclosureFinding(headers: Record<string, string>): SecurityFinding {
  const server = header(headers, 'server')
  const poweredBy = header(headers, 'x-powered-by')
  const disclosed = [server, poweredBy].filter(Boolean).join(' ')

  if (!disclosed) {
    return finding({
      id: 'server-disclosure',
      level: 'ok',
      header: 'Server',
      title: 'The response names no server software',
      detail: 'Server and X-Powered-By are absent.',
      fix: null,
    })
  }

  const hasVersion = /\d+\.\d+/.test(disclosed)

  return finding({
    id: 'server-disclosure',
    level: hasVersion ? 'warning' : 'info',
    header: poweredBy ? 'X-Powered-By' : 'Server',
    title: hasVersion
      ? 'The response names the server software and its version'
      : 'The response names the server software',
    detail: disclosed,
    fix: hasVersion
      ? 'Remove the version from Server, and remove X-Powered-By. A version tells an attacker which exploits to try.'
      : 'Remove X-Powered-By, and keep the Server value short.',
    present: true,
    value: disclosed,
  })
}

function cacheControlFinding(headers: Record<string, string>): SecurityFinding | null {
  const contentType = header(headers, 'content-type')
  if (!contentType || !contentType.toLowerCase().includes('text/html')) {
    return null
  }

  const cacheControl = header(headers, 'cache-control')
  const isPrivate = /no-store|private/i.test(cacheControl ?? '')

  return finding({
    id: 'cache-control',
    level: isPrivate ? 'ok' : 'info',
    header: 'Cache-Control',
    title: isPrivate
      ? 'The HTML response is not stored in a shared cache'
      : cacheControl
        ? 'The HTML response can go into a cache'
        : 'The HTML response has no Cache-Control header',
    detail: cacheControl
      ? `The response is HTML. Cache-Control is ${cacheControl}.`
      : 'The response is HTML. A browser or a proxy then uses its own cache rules.',
    fix: isPrivate
      ? null
      : 'Set Cache-Control: no-store on an HTML page that returns personal data. This check reads the header only. It does not know what the page returns.',
    present: cacheControl !== null,
    value: cacheControl,
  })
}

function auditModernHeaders(
  headers: Record<string, string>,
  hsts: string | null,
): SecurityFinding[] {
  const found: SecurityFinding[] = []

  if (hsts) {
    found.push(hstsPreloadFinding(hsts))
  }

  for (const check of ISOLATION_CHECKS) {
    const value = header(headers, check.header)
    const accepted = value !== null
      && (check.okValues.length === 0 || check.okValues.includes(firstToken(value)))

    found.push(finding({
      id: check.id,
      level: accepted ? 'ok' : 'info',
      header: check.header,
      title: accepted
        ? check.okTitle
        : value === null
          ? `${check.header} is missing`
          : `${check.header} has an unexpected value`,
      detail: value ?? check.missing,
      fix: accepted ? null : check.fix,
      present: value !== null,
      value,
    }))
  }

  const xss = header(headers, 'x-xss-protection')
  if (xss) {
    found.push(finding({
      id: 'x-xss-protection',
      level: 'warning',
      header: 'X-XSS-Protection',
      title: 'X-XSS-Protection is deprecated',
      detail: xss,
      fix: 'Remove X-XSS-Protection. Modern browsers ignore it, and the filter of an old browser can add a vulnerability. Use Content-Security-Policy.',
      present: true,
      value: xss,
    }))
  }

  found.push(serverDisclosureFinding(headers))

  const cache = cacheControlFinding(headers)
  if (cache) {
    found.push(cache)
  }

  return found
}

export function analyzeSecurityHeaders(
  headers: Record<string, string>,
  options: SecurityHeaderOptions = {},
): SecurityHeaderReport {
  const csp = header(headers, 'content-security-policy')
  const hsts = header(headers, 'strict-transport-security')
  const xcto = header(headers, 'x-content-type-options')
  const xfo = header(headers, 'x-frame-options')
  const referrer = header(headers, 'referrer-policy')

  const findings: SecurityFinding[] = []

  if (csp) {
    const directives = parseCsp(csp)
    const sources = Object.values(directives).flat()
    const problems: string[] = []
    const fixes: string[] = []

    if (sources.includes('\'unsafe-inline\'')) {
      problems.push('The policy allows unsafe-inline.')
      fixes.push('Remove unsafe-inline. Use a nonce or a hash for each inline script.')
    }
    if (sources.includes('\'unsafe-eval\'')) {
      problems.push('The policy allows unsafe-eval.')
      fixes.push('Remove unsafe-eval.')
    }
    if (!directives['default-src'] && !directives['script-src']) {
      problems.push('The policy has no default-src and no script-src.')
      fixes.push('Add default-src to give every directive a fallback.')
    }

    findings.push(finding({
      id: 'csp',
      level: problems.length > 0 ? 'warning' : 'ok',
      header: 'Content-Security-Policy',
      title: problems.length > 0
        ? `CSP is present with ${problems.length} problem${problems.length === 1 ? '' : 's'}`
        : 'CSP is present',
      detail: problems.length > 0
        ? `${problems.join(' ')} Directives: ${Object.keys(directives).join(', ')}.`
        : csp,
      fix: fixes.length > 0 ? fixes.join(' ') : null,
      present: true,
      value: csp,
    }))
  }
  else {
    findings.push(finding({
      id: 'csp',
      level: 'error',
      header: 'Content-Security-Policy',
      title: 'CSP is missing',
      detail: 'No Content-Security-Policy header was returned.',
      fix: 'Add Content-Security-Policy with a default-src and script-src policy that fits your app.',
    }))
  }

  if (hsts) {
    const maxAge = /max-age=(\d+)/i.exec(hsts)
    const seconds = maxAge ? Number(maxAge[1]) : 0
    findings.push(finding({
      id: 'hsts',
      level: seconds >= 15_552_000 ? 'ok' : 'warning',
      header: 'Strict-Transport-Security',
      title: seconds >= 15_552_000
        ? 'HSTS is present'
        : 'HSTS max-age is short',
      detail: hsts,
      fix: seconds >= 15_552_000
        ? null
        : 'Set max-age to at least 15552000 (180 days). Add includeSubDomains when ready.',
      present: true,
      value: hsts,
    }))
  }
  else {
    findings.push(finding({
      id: 'hsts',
      level: 'error',
      header: 'Strict-Transport-Security',
      title: 'HSTS is missing',
      detail: 'No Strict-Transport-Security header was returned.',
      fix: 'Add Strict-Transport-Security: max-age=15552000; includeSubDomains on HTTPS responses.',
    }))
  }

  if (xcto) {
    const ok = xcto.toLowerCase() === 'nosniff'
    findings.push(finding({
      id: 'xcto',
      level: ok ? 'ok' : 'warning',
      header: 'X-Content-Type-Options',
      title: ok ? 'X-Content-Type-Options is nosniff' : 'X-Content-Type-Options has an unexpected value',
      detail: xcto,
      fix: ok ? null : 'Set X-Content-Type-Options: nosniff.',
      present: true,
      value: xcto,
    }))
  }
  else {
    findings.push(finding({
      id: 'xcto',
      level: 'error',
      header: 'X-Content-Type-Options',
      title: 'X-Content-Type-Options is missing',
      detail: 'Browsers may MIME-sniff responses without this header.',
      fix: 'Add X-Content-Type-Options: nosniff.',
    }))
  }

  if (xfo) {
    const normalized = xfo.toUpperCase()
    const ok = normalized === 'DENY' || normalized === 'SAMEORIGIN'
    findings.push(finding({
      id: 'xfo',
      level: ok ? 'ok' : 'warning',
      header: 'X-Frame-Options',
      title: ok ? 'X-Frame-Options is set' : 'X-Frame-Options has an unexpected value',
      detail: xfo,
      fix: ok ? null : 'Set X-Frame-Options to DENY or SAMEORIGIN, or use CSP frame-ancestors.',
      present: true,
      value: xfo,
    }))
  }
  else if (csp && /frame-ancestors/i.test(csp)) {
    findings.push(finding({
      id: 'xfo',
      level: 'ok',
      header: 'X-Frame-Options',
      title: 'Clickjacking protection via CSP frame-ancestors',
      detail: 'X-Frame-Options is missing, but CSP frame-ancestors is present.',
      fix: null,
      present: false,
      value: null,
    }))
  }
  else {
    findings.push(finding({
      id: 'xfo',
      level: 'error',
      header: 'X-Frame-Options',
      title: 'X-Frame-Options is missing',
      detail: 'The page may be embeddable in a frame on another origin.',
      fix: 'Add X-Frame-Options: DENY or SAMEORIGIN, or set CSP frame-ancestors.',
    }))
  }

  if (referrer) {
    findings.push(finding({
      id: 'referrer',
      level: 'ok',
      header: 'Referrer-Policy',
      title: 'Referrer-Policy is present',
      detail: referrer,
      fix: null,
      present: true,
      value: referrer,
    }))
  }
  else {
    findings.push(finding({
      id: 'referrer',
      level: 'info',
      header: 'Referrer-Policy',
      title: 'Referrer-Policy is missing',
      detail: 'Browsers use a default referrer policy when this header is absent.',
      fix: 'Add Referrer-Policy: strict-origin-when-cross-origin or a stricter value.',
    }))
  }

  findings.push(...auditModernHeaders(headers, hsts))

  const allowOrigin = header(headers, 'access-control-allow-origin')
  const allowMethods = header(headers, 'access-control-allow-methods')
  const allowHeaders = header(headers, 'access-control-allow-headers')
  const allowCredentials = header(headers, 'access-control-allow-credentials')
  const exposeHeaders = header(headers, 'access-control-expose-headers')
  const maxAge = header(headers, 'access-control-max-age')
  const corsFindings: SecurityFinding[] = []

  if (!allowOrigin) {
    corsFindings.push(finding({
      id: 'cors-origin',
      level: 'info',
      header: 'Access-Control-Allow-Origin',
      title: 'No CORS allow-origin header',
      detail: 'This response does not advertise cross-origin access.',
      fix: 'If browsers must call this URL from another origin, set Access-Control-Allow-Origin to that origin (avoid * with credentials).',
    }))
  }
  else if (allowOrigin === '*') {
    corsFindings.push(finding({
      id: 'cors-origin',
      level: allowCredentials?.toLowerCase() === 'true' ? 'error' : 'warning',
      header: 'Access-Control-Allow-Origin',
      title: allowCredentials?.toLowerCase() === 'true'
        ? 'CORS allows all origins with credentials'
        : 'CORS allows all origins',
      detail: allowOrigin,
      fix: allowCredentials?.toLowerCase() === 'true'
        ? 'Do not combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true. Echo a specific origin instead.'
        : 'Prefer a specific origin instead of * when the API is not fully public.',
      present: true,
      value: allowOrigin,
    }))
  }
  else {
    corsFindings.push(finding({
      id: 'cors-origin',
      level: 'ok',
      header: 'Access-Control-Allow-Origin',
      title: 'CORS allow-origin is set',
      detail: allowOrigin,
      fix: null,
      present: true,
      value: allowOrigin,
    }))
  }

  if (allowCredentials?.toLowerCase() === 'true' && allowOrigin && allowOrigin !== '*') {
    corsFindings.push(finding({
      id: 'cors-credentials',
      level: 'ok',
      header: 'Access-Control-Allow-Credentials',
      title: 'CORS credentials are enabled for a specific origin',
      detail: allowCredentials,
      fix: null,
      present: true,
      value: allowCredentials,
    }))
  }
  else if (allowCredentials?.toLowerCase() === 'true') {
    corsFindings.push(finding({
      id: 'cors-credentials',
      level: 'warning',
      header: 'Access-Control-Allow-Credentials',
      title: 'CORS credentials are enabled',
      detail: allowCredentials,
      fix: 'Only enable credentials when the allow-origin value is a specific trusted origin.',
      present: true,
      value: allowCredentials,
    }))
  }

  const requestMethod = options.requestMethod?.trim().toUpperCase() || null
  const withCredentials = allowCredentials?.toLowerCase() === 'true'
  const allowedMethods = allowMethods
    ? allowMethods.split(',').map(item => item.trim().toUpperCase()).filter(Boolean)
    : []

  if (allowMethods && requestMethod && allowedMethods.includes('*') && withCredentials) {
    corsFindings.push(finding({
      id: 'cors-methods',
      level: 'error',
      header: 'Access-Control-Allow-Methods',
      title: 'The method wildcard is not valid with credentials',
      detail: allowMethods,
      fix: 'List each method by name when Access-Control-Allow-Credentials is true. A browser reads * as a literal method name.',
      present: true,
      value: allowMethods,
    }))
  }
  else if (allowMethods && requestMethod) {
    const allowed = allowedMethods.includes('*') || allowedMethods.includes(requestMethod)
    corsFindings.push(finding({
      id: 'cors-methods',
      level: allowed ? 'ok' : 'error',
      header: 'Access-Control-Allow-Methods',
      title: allowed
        ? `CORS allows the ${requestMethod} method`
        : `CORS does not allow the ${requestMethod} method`,
      detail: allowMethods,
      fix: allowed ? null : `Add ${requestMethod} to Access-Control-Allow-Methods for this origin.`,
      present: true,
      value: allowMethods,
    }))
  }
  else if (requestMethod) {
    const safelisted = SAFELISTED_METHODS.has(requestMethod)
    corsFindings.push(finding({
      id: 'cors-methods',
      level: safelisted ? 'info' : 'error',
      header: 'Access-Control-Allow-Methods',
      title: 'No CORS allow-methods header',
      detail: safelisted
        ? `${requestMethod} is a CORS-safelisted method. A browser can send it with no preflight.`
        : `A browser blocks the ${requestMethod} method without this header.`,
      fix: `Add Access-Control-Allow-Methods with ${requestMethod} to the preflight response.`,
    }))
  }
  else if (allowMethods) {
    corsFindings.push(finding({
      id: 'cors-methods',
      level: 'ok',
      header: 'Access-Control-Allow-Methods',
      title: 'CORS allow-methods is set',
      detail: allowMethods,
      fix: null,
      present: true,
      value: allowMethods,
    }))
  }

  if (typeof options.preflightStatus === 'number') {
    const redirected = options.preflightStatus >= 300 && options.preflightStatus < 400
    const accepted = options.preflightStatus >= 200 && options.preflightStatus < 300
    corsFindings.push(finding({
      id: 'cors-preflight',
      level: redirected ? 'error' : accepted ? 'ok' : 'warning',
      header: 'Preflight',
      title: redirected
        ? 'The preflight response is a redirect'
        : accepted
          ? 'The preflight response is a success'
          : 'The preflight response is an error',
      detail: `The OPTIONS request returned status ${options.preflightStatus}.`,
      fix: redirected
        ? 'Answer the OPTIONS request at this URL. The CORS specification does not let a browser follow a redirect on a preflight.'
        : accepted
          ? null
          : 'Answer the OPTIONS request with status 204 and the Access-Control-Allow-* headers.',
      present: true,
      value: String(options.preflightStatus),
    }))
  }

  if (allowHeaders) {
    corsFindings.push(finding({
      id: 'cors-headers',
      level: 'ok',
      header: 'Access-Control-Allow-Headers',
      title: 'CORS allow-headers is set',
      detail: allowHeaders,
      fix: null,
      present: true,
      value: allowHeaders,
    }))
  }

  if (options.requestOrigin && allowOrigin && allowOrigin !== '*' && allowOrigin !== options.requestOrigin) {
    corsFindings.push(finding({
      id: 'cors-origin-echo',
      level: 'warning',
      header: 'Access-Control-Allow-Origin',
      title: 'Allow-origin does not match the request Origin',
      detail: `Request Origin was ${options.requestOrigin}. Response allow-origin was ${allowOrigin}.`,
      fix: 'Echo the request Origin when it is on your allow list.',
      present: true,
      value: allowOrigin,
    }))
  }

  const allFindings = [...findings, ...corsFindings]
  const score = scoreFromFindings(allFindings)

  return {
    score,
    grade: gradeFromScore(score),
    findings: allFindings,
    cors: {
      allowOrigin,
      allowMethods,
      allowHeaders,
      allowCredentials,
      exposeHeaders,
      maxAge,
      findings: corsFindings,
    },
  }
}
