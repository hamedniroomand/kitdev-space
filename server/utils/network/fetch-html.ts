import { assertSafeUrl } from './ssrf'

const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 1_000_000
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function isTimeout(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'TimeoutError'
}

/**
 * Read the body and stop at `MAX_HTML_BYTES`.
 *
 * A remote host controls both `content-length` and the real body length, so the
 * declared size is only a first filter. Reading through the stream with a
 * running total keeps a large or chunked response from filling memory.
 */
async function readCappedBody(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    return new Uint8Array(0)
  }

  const chunks: Uint8Array[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (!value) {
        continue
      }

      total += value.byteLength
      if (total > MAX_HTML_BYTES) {
        throw new Error('The HTML response is too large.')
      }
      chunks.push(value)
    }
  } finally {
    void reader.cancel().catch(() => {})
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return body
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

      if (!response.ok) {
        void response.body?.cancel()
        throw new Error(`The request failed with status ${response.status}.`)
      }

      const declared = Number(response.headers.get('content-length'))
      if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) {
        void response.body?.cancel()
        throw new Error('The HTML response is too large.')
      }

      const buffer = await readCappedBody(response)

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
