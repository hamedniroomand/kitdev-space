import { assertSafeUrl } from './ssrf'

const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 1_000_000
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function isTimeout(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'TimeoutError'
}

export async function fetchHtmlDocument(input: string): Promise<{ html: string, finalUrl: string }> {
  let current = await assertSafeUrl(input)

  try {
    for (let followed = 0; followed <= MAX_REDIRECTS; followed++) {
      const response = await Bun.fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        }
      })

      const location = response.headers.get('location')
      if (REDIRECT_STATUSES.has(response.status) && location && followed < MAX_REDIRECTS) {
        void response.body?.cancel()
        current = await assertSafeUrl(new URL(location, current).href)
        continue
      }

      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > MAX_HTML_BYTES) {
        throw new Error('The HTML response is too large.')
      }

      if (!response.ok) {
        throw new Error(`The request failed with status ${response.status}.`)
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase()
      if (
        contentType
        && !contentType.includes('text/html')
        && !contentType.includes('application/xhtml')
        && !contentType.includes('text/plain')
      ) {
        throw new Error('The URL did not return HTML.')
      }

      const html = new TextDecoder('utf-8').decode(buffer)
      return {
        html,
        finalUrl: response.url || current.href
      }
    }
  } catch (cause) {
    if (cause instanceof Error && (
      cause.message.includes('too large')
      || cause.message.includes('did not return HTML')
      || cause.message.includes('status')
    )) {
      throw cause
    }
    if (typeof cause === 'object' && cause !== null && 'statusCode' in cause) {
      throw cause
    }
    if (isTimeout(cause)) {
      throw new Error('The request timed out.', { cause })
    }
    throw new Error('The request failed.', { cause })
  }

  throw new Error('Too many redirects.')
}
