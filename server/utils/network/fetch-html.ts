import { assertSafeUrl } from './ssrf'

const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 1_000_000
const META_SCAN_BYTES = 4096
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KitDev/1.0'

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
  }
  finally {
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

/**
 * True when the response can hold HTML.
 *
 * A response with no `content-type` stays allowed, because many hosts send
 * HTML with no header. A binary type, such as `image/png`, is refused.
 */
export function isHtmlContentType(value: string | null): boolean {
  const type = (value || '').toLowerCase()
  if (!type) {
    return true
  }
  return type.includes('text/html')
    || type.includes('application/xhtml')
    || type.includes('text/plain')
}

/**
 * Find the character set of the response.
 *
 * The order follows the HTML standard: the `content-type` header, then the
 * byte order mark, then a `<meta>` declaration in the start of the document.
 */
export function detectCharset(contentType: string | null, bytes: Uint8Array): string {
  const fromHeader = /charset\s*=\s*"?([\w:.-]+)"?/i.exec(contentType || '')
  if (fromHeader?.[1]) {
    return fromHeader[1].toLowerCase()
  }

  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le'
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be'
  }

  const head = new TextDecoder('latin1').decode(bytes.subarray(0, META_SCAN_BYTES))
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w:.-]+)/i.exec(head)
  if (fromMeta?.[1]) {
    return fromMeta[1].toLowerCase()
  }

  return 'utf-8'
}

/** Decode the body. An unknown character set falls back to UTF-8. */
export function decodeHtml(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes)
  }
  catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

export interface FetchHtmlOptions {
  /** The User-Agent header of the request. */
  userAgent?: string
}

export interface FetchHtmlResult {
  html: string
  finalUrl: string
  charset: string
  contentType: string | null
}

export async function fetchHtmlDocument(input: string, options: FetchHtmlOptions = {}): Promise<FetchHtmlResult> {
  let current = await assertSafeUrl(input)

  try {
    for (let followed = 0; followed <= MAX_REDIRECTS; followed++) {
      const response = await Bun.fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
        },
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

      const contentType = response.headers.get('content-type')
      if (!isHtmlContentType(contentType)) {
        void response.body?.cancel()
        throw new Error('The URL did not return HTML.')
      }

      const declared = Number(response.headers.get('content-length'))
      if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) {
        void response.body?.cancel()
        throw new Error('The HTML response is too large.')
      }

      const buffer = await readCappedBody(response)
      const charset = detectCharset(contentType, buffer)

      return {
        html: decodeHtml(buffer, charset),
        finalUrl: response.url || current.href,
        charset,
        contentType,
      }
    }
  }
  catch (cause) {
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
