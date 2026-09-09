import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { decodeHtml, detectCharset, fetchHtmlDocument, isHtmlContentType } from '#server/utils/network/fetch-html'

const latin1 = new Uint8Array([0x3C, 0x70, 0x3E, 0x63, 0x61, 0x66, 0xE9, 0x3C, 0x2F, 0x70, 0x3E]) // <p>café</p>

describe('isHtmlContentType', () => {
  it('accepts html types and an absent header', () => {
    expect(isHtmlContentType('text/html; charset=utf-8')).toBe(true)
    expect(isHtmlContentType('application/xhtml+xml')).toBe(true)
    expect(isHtmlContentType('text/plain')).toBe(true)
    expect(isHtmlContentType(null)).toBe(true)
  })

  it('refuses a binary type', () => {
    expect(isHtmlContentType('image/png')).toBe(false)
    expect(isHtmlContentType('application/pdf')).toBe(false)
    expect(isHtmlContentType('application/octet-stream')).toBe(false)
  })
})

describe('detectCharset', () => {
  it('reads the charset of the content type header', () => {
    expect(detectCharset('text/html; charset=ISO-8859-1', new Uint8Array(0))).toBe('iso-8859-1')
  })

  it('reads a byte order mark', () => {
    expect(detectCharset(null, new Uint8Array([0xEF, 0xBB, 0xBF, 0x41]))).toBe('utf-8')
    expect(detectCharset(null, new Uint8Array([0xFF, 0xFE, 0x41, 0x00]))).toBe('utf-16le')
  })

  it('reads a meta charset declaration', () => {
    const bytes = new TextEncoder().encode('<html><head><meta charset="windows-1252"></head>')
    expect(detectCharset(null, bytes)).toBe('windows-1252')
  })

  it('falls back to utf-8', () => {
    expect(detectCharset('text/html', new TextEncoder().encode('<html></html>'))).toBe('utf-8')
  })
})

describe('decodeHtml', () => {
  it('decodes latin1 bytes', () => {
    expect(decodeHtml(latin1, 'iso-8859-1')).toBe('<p>café</p>')
  })

  it('falls back to utf-8 for an unknown charset', () => {
    expect(decodeHtml(new TextEncoder().encode('ok'), 'not-a-charset')).toBe('ok')
  })
})

describe('fetchHtmlDocument', () => {
  let lookup: ReturnType<typeof spyOn<typeof Bun.dns, 'lookup'>>
  let fetchSpy: ReturnType<typeof spyOn<typeof Bun, 'fetch'>>

  beforeEach(() => {
    lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4, ttl: 0 },
    ])
    fetchSpy = spyOn(Bun, 'fetch')
  })

  afterEach(() => {
    lookup.mockRestore()
    fetchSpy.mockRestore()
  })

  it('decodes the body with the charset of the header', async () => {
    fetchSpy.mockResolvedValue(new Response(latin1, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=iso-8859-1' },
    }))

    const result = await fetchHtmlDocument('https://example.com/')

    expect(result.charset).toBe('iso-8859-1')
    expect(result.html).toBe('<p>café</p>')
  })

  it('decodes the body with the meta charset when the header has none', async () => {
    const bytes = new Uint8Array([
      ...new TextEncoder().encode('<html><head><meta charset="iso-8859-1"></head><body>'),
      0xE9,
      ...new TextEncoder().encode('</body></html>'),
    ])
    fetchSpy.mockResolvedValue(new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))

    const result = await fetchHtmlDocument('https://example.com/')

    expect(result.charset).toBe('iso-8859-1')
    expect(result.html).toContain('<body>é</body>')
  })

  it('refuses a response that is not HTML and cancels the body', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([0x89, 0x50]))
      },
      cancel() {
        cancelled = true
      },
    })
    fetchSpy.mockResolvedValue(new Response(body, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }))

    await expect(fetchHtmlDocument('https://example.com/logo.png')).rejects.toThrow('did not return HTML')
    expect(cancelled).toBe(true)
  })

  it('sends the given User-Agent header', async () => {
    fetchSpy.mockResolvedValue(new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }))

    await fetchHtmlDocument('https://example.com/', { userAgent: 'Twitterbot/1.0' })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('Twitterbot/1.0')
  })

  it('does not fetch a private URL', async () => {
    await expect(fetchHtmlDocument('http://127.0.0.1/')).rejects.toMatchObject({ statusCode: 400 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
