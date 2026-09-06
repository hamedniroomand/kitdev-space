export type FindingLevel = 'ok' | 'info' | 'warning' | 'error'

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

function scoreFromFindings(findings: SecurityFinding[]): number {
  const scored = findings.filter(item => item.id !== 'cors-origin-echo')
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

export function analyzeSecurityHeaders(
  headers: Record<string, string>,
  options: { requestOrigin?: string | null } = {},
): SecurityHeaderReport {
  const csp = header(headers, 'content-security-policy')
  const hsts = header(headers, 'strict-transport-security')
  const xcto = header(headers, 'x-content-type-options')
  const xfo = header(headers, 'x-frame-options')
  const referrer = header(headers, 'referrer-policy')

  const findings: SecurityFinding[] = []

  if (csp) {
    findings.push(finding({
      id: 'csp',
      level: csp.includes('unsafe-inline') || csp.includes('unsafe-eval') ? 'warning' : 'ok',
      header: 'Content-Security-Policy',
      title: csp.includes('unsafe-inline') || csp.includes('unsafe-eval')
        ? 'CSP is present but allows unsafe sources'
        : 'CSP is present',
      detail: csp,
      fix: csp.includes('unsafe-inline') || csp.includes('unsafe-eval')
        ? 'Remove unsafe-inline and unsafe-eval. Prefer nonces or hashes for scripts.'
        : null,
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

  if (allowMethods) {
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
