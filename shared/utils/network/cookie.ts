export type FindingLevel = 'error' | 'warning' | 'info'

export interface CookieFinding {
  level: FindingLevel
  message: string
}

export interface SetCookie {
  name: string
  value: string
  domain?: string
  path?: string
  /** The Expires attribute as an ISO date, or null when the date does not parse. */
  expires?: string | null
  maxAge?: number
  secure: boolean
  httpOnly: boolean
  sameSite?: string
  partitioned: boolean
  priority?: string
  /** True when the cookie has no Expires and no Max-Age. */
  session: boolean
  /** Seconds until the cookie expires. Max-Age wins over Expires. Null for a session cookie. */
  lifetimeSeconds: number | null
  /** Bytes of `name=value`. Browsers drop a cookie above 4096. */
  size: number
  findings: CookieFinding[]
}

export interface RequestCookie {
  name: string
  value: string
}

export interface CookieReport {
  setCookies: SetCookie[]
  requestCookies: RequestCookie[]
}

/** How the browser makes the request that carries the cookie. */
export type RequestContext = 'same-site' | 'cross-site' | 'cross-site-navigation'

export interface CookieDelivery {
  /** True when the browser sends the cookie to the request URL. */
  sent: boolean
  /** One message for each rule that stops the cookie. Empty when sent is true. */
  blocks: string[]
  /** One message for each limit of the check. */
  notes: string[]
}

const MAX_COOKIE_BYTES = 4096
/** Chrome caps a cookie lifetime at 400 days. */
const MAX_LIFETIME_SECONDS = 400 * 24 * 60 * 60
const ATTRIBUTE_NAMES = ['domain', 'path', 'expires', 'max-age', 'secure', 'httponly', 'samesite', 'partitioned', 'priority']
const SAME_SITE_VALUES = ['strict', 'lax', 'none']

function splitPair(part: string): [string, string | undefined] {
  const index = part.indexOf('=')
  if (index < 0) {
    return [part.trim(), undefined]
  }
  return [part.slice(0, index).trim(), part.slice(index + 1).trim()]
}

/** Parses one Set-Cookie header value and checks its attributes. */
export function parseSetCookie(line: string, now = Date.now()): SetCookie {
  const [first, ...rest] = line.split(';')
  const [name, rawValue] = splitPair(first ?? '')
  const value = rawValue ?? ''
  const findings: CookieFinding[] = []

  const cookie: SetCookie = {
    name,
    value,
    secure: false,
    httpOnly: false,
    partitioned: false,
    session: true,
    lifetimeSeconds: null,
    size: new TextEncoder().encode(`${name}=${value}`).byteLength,
    findings,
  }

  for (const part of rest) {
    const [key, attributeValue] = splitPair(part)
    switch (key.toLowerCase()) {
      case 'domain':
        cookie.domain = attributeValue
        break
      case 'path':
        cookie.path = attributeValue
        break
      case 'expires': {
        const time = attributeValue ? Date.parse(attributeValue) : Number.NaN
        cookie.expires = Number.isNaN(time) ? null : new Date(time).toISOString()
        if (Number.isNaN(time)) {
          findings.push({ level: 'warning', message: `Expires "${attributeValue ?? ''}" is not a valid date. Browsers ignore it, and the cookie becomes a session cookie.` })
        }
        else {
          cookie.session = false
          cookie.lifetimeSeconds = Math.round((time - now) / 1000)
        }
        break
      }
      case 'max-age': {
        const seconds = Number(attributeValue)
        if (Number.isInteger(seconds)) {
          cookie.maxAge = seconds
          cookie.session = false
          cookie.lifetimeSeconds = seconds
        }
        else {
          findings.push({ level: 'warning', message: `Max-Age "${attributeValue ?? ''}" is not an integer. Browsers ignore it.` })
        }
        break
      }
      case 'secure':
        cookie.secure = true
        break
      case 'httponly':
        cookie.httpOnly = true
        break
      case 'samesite':
        cookie.sameSite = attributeValue
        break
      case 'partitioned':
        cookie.partitioned = true
        break
      case 'priority':
        cookie.priority = attributeValue
        break
      default:
        if (key) {
          findings.push({ level: 'info', message: `"${key}" is not a known attribute. Browsers ignore it.` })
        }
    }
  }

  if (!name) {
    findings.push({ level: 'error', message: 'The cookie has no name.' })
  }

  const sameSite = cookie.sameSite?.toLowerCase()
  if (cookie.sameSite !== undefined && (!sameSite || !SAME_SITE_VALUES.includes(sameSite))) {
    findings.push({ level: 'warning', message: `SameSite "${cookie.sameSite}" is not Strict, Lax, or None. Chrome treats it as Lax.` })
  }
  if (sameSite === 'none' && !cookie.secure) {
    findings.push({ level: 'error', message: 'SameSite=None needs Secure. Chrome and Firefox reject this cookie.' })
  }
  if (cookie.sameSite === undefined) {
    findings.push({ level: 'warning', message: 'No SameSite attribute. Chrome defaults to Lax, other browsers differ. Set it explicitly.' })
  }
  if (!cookie.secure) {
    findings.push({ level: 'warning', message: 'No Secure attribute. The browser also sends this cookie over plain HTTP.' })
  }
  if (!cookie.httpOnly) {
    findings.push({ level: 'warning', message: 'No HttpOnly attribute. Script can read this cookie, so an XSS bug can steal it. Skip this only when the page must read the value.' })
  }
  if (cookie.partitioned && !cookie.secure) {
    findings.push({ level: 'error', message: 'Partitioned needs Secure.' })
  }
  if (name.startsWith('__Secure-') && !cookie.secure) {
    findings.push({ level: 'error', message: 'A __Secure- cookie needs Secure. The browser rejects it.' })
  }
  if (name.startsWith('__Host-')) {
    if (!cookie.secure || cookie.domain !== undefined || cookie.path !== '/') {
      findings.push({ level: 'error', message: 'A __Host- cookie needs Secure, Path=/, and no Domain. The browser rejects it.' })
    }
  }
  if (cookie.domain?.startsWith('.')) {
    findings.push({ level: 'info', message: 'The leading dot in Domain is ignored. The cookie is sent to the domain and its subdomains either way.' })
  }
  if (cookie.lifetimeSeconds !== null && cookie.lifetimeSeconds > MAX_LIFETIME_SECONDS) {
    findings.push({ level: 'warning', message: 'The lifetime is above 400 days. Chrome caps it at 400 days.' })
  }
  if (cookie.lifetimeSeconds !== null && cookie.lifetimeSeconds <= 0) {
    findings.push({ level: 'info', message: 'The lifetime is zero or in the past. This header deletes the cookie.' })
  }
  if (cookie.size > MAX_COOKIE_BYTES) {
    findings.push({ level: 'error', message: `The cookie is ${cookie.size} bytes. Browsers drop a cookie above ${MAX_COOKIE_BYTES} bytes.` })
  }

  return cookie
}

/** Parses the value of a Cookie request header: `a=1; b=2`. */
export function parseCookieHeader(line: string): RequestCookie[] {
  return line.split(';')
    .map(part => splitPair(part))
    .filter(([name]) => name.length > 0)
    .map(([name, value]) => ({ name, value: value ?? '' }))
}

function looksLikeSetCookie(line: string): boolean {
  const parts = line.split(';').slice(1).map(part => splitPair(part)[0].toLowerCase())
  return parts.some(key => ATTRIBUTE_NAMES.includes(key))
}

/**
 * Reads one header per line. A `Set-Cookie:` or `Cookie:` prefix decides the
 * kind. A line with no prefix is a Set-Cookie when it has a known attribute or
 * one pair, and a Cookie request header when it has several plain pairs.
 */
export function inspectCookies(input: string, now = Date.now()): CookieReport {
  const report: CookieReport = { setCookies: [], requestCookies: [] }

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const prefixed = /^(set-cookie|cookie)\s*:\s*/i.exec(line)
    const body = prefixed ? line.slice(prefixed[0].length) : line
    const kind = prefixed
      ? prefixed[1]!.toLowerCase()
      : (looksLikeSetCookie(body) || body.split(';').length === 1 ? 'set-cookie' : 'cookie')

    if (kind === 'cookie') {
      report.requestCookies.push(...parseCookieHeader(body))
    }
    else {
      report.setCookies.push(parseSetCookie(body, now))
    }
  }

  return report
}

/** RFC 6265 domain match. A leading dot in the Domain attribute has no effect. */
function domainMatches(host: string, domain: string): boolean {
  const target = domain.replace(/^\./, '').toLowerCase()
  const name = host.toLowerCase()
  return name === target || name.endsWith(`.${target}`)
}

/** RFC 6265 path match. The cookie path must end at a path segment boundary. */
function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (requestPath === cookiePath) {
    return true
  }
  if (!requestPath.startsWith(cookiePath)) {
    return false
  }
  return cookiePath.endsWith('/') || requestPath[cookiePath.length] === '/'
}

/** A browser gives a secure context to localhost over plain HTTP. */
function isSecureContext(url: URL): boolean {
  return url.protocol === 'https:'
    || url.hostname === 'localhost'
    || url.hostname.endsWith('.localhost')
    || url.hostname === '127.0.0.1'
    || url.hostname === '[::1]'
}

/**
 * Checks whether the browser sends one Set-Cookie cookie to a request URL.
 *
 * The Set-Cookie header does not name the host that sent it, so the check uses
 * the host of the request URL for a host-only cookie and for a default path.
 */
export function evaluateCookieDelivery(cookie: SetCookie, requestUrl: string, context: RequestContext = 'same-site'): CookieDelivery {
  let url: URL
  try {
    url = new URL(requestUrl)
  }
  catch {
    return { sent: false, blocks: ['The request URL is not valid. Use a full URL, such as https://example.com/app.'], notes: [] }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { sent: false, blocks: ['The browser sends a cookie over HTTP and HTTPS only.'], notes: [] }
  }

  // An error finding is a rejection rule. The browser does not keep the cookie,
  // so it never sends it.
  if (cookie.findings.some(finding => finding.level === 'error')) {
    return { sent: false, blocks: ['The browser rejects this cookie. Correct the errors below first.'], notes: [] }
  }

  const blocks: string[] = []
  const notes: string[] = []

  if (cookie.lifetimeSeconds !== null && cookie.lifetimeSeconds <= 0) {
    blocks.push('The lifetime is zero or in the past. This header deletes the cookie, so the browser sends nothing.')
  }

  if (cookie.domain) {
    if (!domainMatches(url.hostname, cookie.domain)) {
      blocks.push(`Domain mismatch. Domain=${cookie.domain} does not cover the host ${url.hostname}.`)
    }
  }
  else {
    notes.push(`Host only. The cookie has no Domain attribute, so the check uses the host of the request URL, ${url.hostname}.`)
  }

  if (cookie.path?.startsWith('/')) {
    if (!pathMatches(url.pathname, cookie.path)) {
      blocks.push(`Path mismatch. Path=${cookie.path} does not cover the request path ${url.pathname}.`)
    }
  }
  else if (cookie.path) {
    notes.push(`Path=${cookie.path} does not start with a slash. The browser ignores it and uses the directory of the URL that set the cookie.`)
  }
  else {
    notes.push('No Path attribute. The browser uses the directory of the URL that set the cookie.')
  }

  if (cookie.secure && !isSecureContext(url)) {
    blocks.push('Secure over HTTP. The cookie has the Secure attribute, so the browser sends it over HTTPS only.')
  }

  const sameSite = cookie.sameSite?.toLowerCase()
  const effective = sameSite === 'strict' || sameSite === 'none' ? sameSite : 'lax'
  if (context !== 'same-site' && effective === 'strict') {
    blocks.push('SameSite=Strict. The browser sends the cookie with a same-site request only.')
  }
  if (context === 'cross-site' && effective === 'lax') {
    blocks.push(cookie.sameSite === undefined
      ? 'No SameSite attribute, so Chrome uses Lax. The browser sends the cookie with a top-level navigation only, not with a subresource or a POST.'
      : 'SameSite=Lax. The browser sends the cookie with a top-level navigation only, not with a subresource or a POST.')
  }

  return { sent: blocks.length === 0, blocks, notes }
}

/** The mask that replaces a cookie value in the JSON export. */
export const REDACTED_VALUE = '[redacted]'

/**
 * Replaces every cookie value with one fixed mask. The mask has a constant
 * length, because the length of a secret is also information. The size field
 * keeps the byte count of the true value.
 */
export function redactCookieReport(report: CookieReport): CookieReport {
  return {
    setCookies: report.setCookies.map(cookie => ({ ...cookie, value: REDACTED_VALUE })),
    requestCookies: report.requestCookies.map(cookie => ({ ...cookie, value: REDACTED_VALUE })),
  }
}
