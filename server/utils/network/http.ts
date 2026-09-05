import { assertSafeUrl } from './ssrf'

export interface HeaderInspectResult {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
}

export interface RedirectHop {
  url: string
  status: number
  location?: string
}

const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
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

async function fetchOnce(url: URL, method: 'HEAD' | 'GET'): Promise<Response> {
  return Bun.fetch(url, {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
}

function toResult(response: Response, fallbackUrl: URL): HeaderInspectResult {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: headersToRecord(response.headers),
    url: response.url || fallbackUrl.href
  }
}

export async function fetchHeaders(input: string): Promise<HeaderInspectResult> {
  const url = await assertSafeUrl(input)

  try {
    let response = await fetchOnce(url, 'HEAD')

    if (response.status === 405 || response.status === 501) {
      discardBody(response)
      response = await fetchOnce(url, 'GET')
    }

    discardBody(response)
    return toResult(response, url)
  } catch (cause) {
    if (isTimeout(cause)) {
      throw new Error('The request timed out.', { cause })
    }

    throw new Error('The request failed.', { cause })
  }
}

export async function walkRedirects(input: string): Promise<RedirectHop[]> {
  const hops: RedirectHop[] = []
  let current = await assertSafeUrl(input)

  try {
    for (let followed = 0; followed <= MAX_REDIRECTS; followed++) {
      const response = await fetchOnce(current, 'GET')
      discardBody(response)

      const header = response.headers.get('location')
      const location = header || undefined
      const hop: RedirectHop = {
        url: current.href,
        status: response.status
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

      current = await assertSafeUrl(new URL(location, current).href)
    }
  } catch (cause) {
    if (isDeniedUrl(cause)) {
      throw cause
    }

    if (isTimeout(cause)) {
      throw new Error('The request timed out.', { cause })
    }

    throw new Error('The request failed.', { cause })
  }

  return hops
}
