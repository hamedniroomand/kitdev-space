import type { HttpRequestMethod, RedirectHop } from '#shared/utils/network/http-report'
import { assertSafeUrl } from './ssrf'

export type { HttpRequestMethod, RedirectHop }

export interface HeaderInspectResult {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
  /** The method that produced this result. HEAD can fall back to GET. */
  method: HttpRequestMethod
}

const TIMEOUT_MS = 8000
/** The tool follows at most 10 redirects, so a chain holds at most 11 hops. */
const MAX_REDIRECTS = 10
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}

  if (typeof headers.getSetCookie === 'function') {
    const cookies = headers.getSetCookie()
    if (cookies.length > 0) {
      record['set-cookie'] = cookies.join('\n')
    }
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      if (!record['set-cookie']) {
        record['set-cookie'] = value
      }
      return
    }

    const existing = record[key]
    record[key] = existing === undefined ? value : `${existing}\n${value}`
  })

  return record
}

function discardBody(response: Response): void {
  void response.body?.cancel()
}

function isTimeout(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'TimeoutError'
}

function isDeniedUrl(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'statusCode' in cause
}

function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status)
}

async function fetchOnce(
  url: URL,
  method: HttpRequestMethod,
  requestHeaders?: Record<string, string>,
): Promise<Response> {
  return Bun.fetch(url, {
    method,
    redirect: 'manual',
    headers: requestHeaders,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

function toResult(
  response: Response,
  fallbackUrl: URL,
  method: HttpRequestMethod,
): HeaderInspectResult {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: headersToRecord(response.headers),
    url: response.url || fallbackUrl.href,
    method,
  }
}

export async function fetchHeaders(
  input: string,
  options: {
    origin?: string
    method?: HttpRequestMethod
    /** The method to put in Access-Control-Request-Method on a preflight. */
    requestMethod?: string
  } = {},
): Promise<HeaderInspectResult> {
  const url = await assertSafeUrl(input)
  const requestHeaders = options.origin
    ? {
        'Origin': options.origin,
        'Access-Control-Request-Method': options.requestMethod ?? 'GET',
        'Access-Control-Request-Headers': 'content-type',
      }
    : undefined

  try {
    if (options.method === 'OPTIONS') {
      const response = await fetchOnce(url, 'OPTIONS', requestHeaders)
      discardBody(response)
      return toResult(response, url, 'OPTIONS')
    }

    let response = await fetchOnce(url, 'HEAD', requestHeaders)

    if (response.status === 405 || response.status === 501) {
      discardBody(response)
      response = await fetchOnce(url, 'GET', requestHeaders)
      discardBody(response)
      return toResult(response, url, 'GET')
    }

    discardBody(response)
    return toResult(response, url, 'HEAD')
  }
  catch (cause) {
    if (isTimeout(cause)) {
      throw new Error('The request timed out.', { cause })
    }

    throw new Error('The request failed.', { cause })
  }
}

export async function walkRedirects(input: string): Promise<RedirectHop[]> {
  const hops: RedirectHop[] = []
  let current = await assertSafeUrl(input)
  const visited = new Set<string>([current.href])

  try {
    for (let followed = 0; followed <= MAX_REDIRECTS; followed++) {
      const started = performance.now()
      const response = await fetchOnce(current, 'GET')
      discardBody(response)

      const header = response.headers.get('location')
      const location = header || undefined
      const hop: RedirectHop = {
        url: current.href,
        status: response.status,
        statusText: response.statusText,
        headers: headersToRecord(response.headers),
        durationMs: Math.round(performance.now() - started),
      }

      if (location !== undefined) {
        hop.location = location
      }

      hops.push(hop)

      if (
        !isRedirectStatus(response.status)
        || location === undefined
        || followed === MAX_REDIRECTS
      ) {
        break
      }

      let next: URL
      try {
        next = await assertSafeUrl(new URL(location, current).href)
      }
      catch (cause) {
        // Keep hops. Do not fetch the blocked Location.
        if (isDeniedUrl(cause)) {
          return hops
        }
        throw cause
      }

      // A URL that is already in the chain makes a loop. Stop before the fetch.
      if (visited.has(next.href)) {
        hop.loop = true
        break
      }

      visited.add(next.href)
      current = next
    }
  }
  catch (cause) {
    // Keep hops already recorded when a later hop times out or fails.
    if (hops.length > 0) {
      return hops
    }

    if (isTimeout(cause)) {
      throw new Error('The request timed out.', { cause })
    }

    throw new Error('The request failed.', { cause })
  }

  return hops
}
