import { assertSafeUrl } from './ssrf'

export interface HeaderInspectResult {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
}

const TIMEOUT_MS = 8000

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

function discardBody(response: Response): void {
  void response.body?.cancel()
}

function isTimeout(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'TimeoutError'
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
