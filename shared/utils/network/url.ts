/** One query parameter. The raw fields keep the text exactly as the URL holds it. */
export interface UrlQueryParam {
  key: string
  value: string
  rawKey: string
  rawValue: string
  /** True when the query part has no `=` sign, such as `?flag`. */
  bare: boolean
}

export interface UrlParts {
  href: string
  protocol: string
  username: string
  password: string
  host: string
  hostname: string
  port: string
  pathname: string
  pathnameDecoded: string
  search: string
  params: UrlQueryParam[]
  hash: string
}

/** The text that replaces a user name or a password in a display or an export. */
export const CREDENTIAL_MASK = '***'

function decodePercent(raw: string): string {
  try {
    return decodeURIComponent(raw)
  }
  catch {
    // An incomplete escape, such as `100%`, is legal in a URL. Show it as it is.
    return raw
  }
}

/** Decode a query key or a query value. A plus sign is a space in a query. */
export function decodeQueryPart(raw: string): string {
  return decodePercent(raw.replace(/\+/g, ' '))
}

/** Decode a path. A plus sign is a literal plus sign in a path. */
export function decodePathPart(raw: string): string {
  return decodePercent(raw)
}

/** Encode a key or a value that the user edited. */
export function encodeQueryPart(text: string): string {
  return encodeURIComponent(text)
}

/** Read a query string into rows. Duplicate keys stay as separate rows. */
export function parseQueryParams(search: string): UrlQueryParam[] {
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) {
    return []
  }

  const params: UrlQueryParam[] = []
  for (const part of query.split('&')) {
    if (!part) {
      continue
    }
    const separator = part.indexOf('=')
    const bare = separator === -1
    const rawKey = bare ? part : part.slice(0, separator)
    const rawValue = bare ? '' : part.slice(separator + 1)
    params.push({
      key: decodeQueryPart(rawKey),
      value: decodeQueryPart(rawValue),
      rawKey,
      rawValue,
      bare,
    })
  }
  return params
}

/** Write rows back to a query string. The raw text of an unchanged row stays the same. */
export function buildQueryString(params: UrlQueryParam[]): string {
  return params
    .map(param => (param.bare ? param.rawKey : `${param.rawKey}=${param.rawValue}`))
    .join('&')
}

/** Rebuild a URL with a new set of query parameters. */
export function buildUrlWithParams(href: string, params: UrlQueryParam[]): string {
  const url = new URL(href)
  const query = buildQueryString(params)
  url.search = query ? `?${query}` : ''
  return url.href
}

/** Replace the user name and the password of a URL with the mask. */
export function maskUrlCredentials(href: string): string {
  let url: URL
  try {
    url = new URL(href)
  }
  catch {
    return href
  }

  if (!url.username && !url.password) {
    return href
  }
  if (url.username) {
    url.username = CREDENTIAL_MASK
  }
  if (url.password) {
    url.password = CREDENTIAL_MASK
  }
  return url.href
}

/** Replace the credentials in every field of a parsed URL. */
export function maskUrlParts(parts: UrlParts): UrlParts {
  if (!parts.username && !parts.password) {
    return parts
  }
  return {
    ...parts,
    href: maskUrlCredentials(parts.href),
    username: parts.username ? CREDENTIAL_MASK : '',
    password: parts.password ? CREDENTIAL_MASK : '',
  }
}

export function inspectUrl(input: string): UrlParts {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Enter a URL.')
  }

  let url: URL
  try {
    url = new URL(trimmed)
  }
  catch {
    throw new Error('Enter a valid URL.')
  }

  return {
    href: url.href,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    pathnameDecoded: decodePathPart(url.pathname),
    search: url.search,
    params: parseQueryParams(url.search),
    hash: url.hash,
  }
}
