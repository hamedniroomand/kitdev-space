import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { fetchHeaders, walkRedirects } from '../../../server/utils/network/http'

function mockResponse(init: {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  url?: string
  body?: BodyInit | null
}): Response {
  const response = new Response(init.body ?? null, {
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: init.headers
  })

  if (init.url) {
    Object.defineProperty(response, 'url', { value: init.url })
  }

  return response
}

describe('fetchHeaders', () => {
  let lookup: ReturnType<typeof spyOn<typeof Bun.dns, 'lookup'>>
  let fetchSpy: ReturnType<typeof spyOn<typeof Bun, 'fetch'>>

  beforeEach(() => {
    lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4, ttl: 0 }
    ])
    fetchSpy = spyOn(Bun, 'fetch')
  })

  afterEach(() => {
    lookup.mockRestore()
    fetchSpy.mockRestore()
  })

  it('does not fetch a private URL', async () => {
    await expect(fetchHeaders('http://127.0.0.1/')).rejects.toMatchObject({
      statusCode: 400
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('preserves multiple Set-Cookie headers', async () => {
    const headers = new Headers()
    headers.append('Set-Cookie', 'session=abc; Path=/')
    headers.append('Set-Cookie', 'theme=dark; Path=/')

    fetchSpy.mockResolvedValue(new Response(null, {
      status: 200,
      statusText: 'OK',
      headers
    }))

    const result = await fetchHeaders('https://example.com/')

    expect(result.headers['set-cookie']).toBe('session=abc; Path=/\ntheme=dark; Path=/')
  })

  it('returns status, headers, and the final URL from HEAD', async () => {
    fetchSpy.mockResolvedValue(mockResponse({
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html', 'X-Test': '1' },
      url: 'https://example.com/'
    }))

    const result = await fetchHeaders('https://example.com/')

    expect(result).toEqual({
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'text/html',
        'x-test': '1'
      },
      url: 'https://example.com/'
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0] as [URL, RequestInit]
    expect(url).toBeInstanceOf(URL)
    expect(url.href).toBe('https://example.com/')
    expect(options.method).toBe('HEAD')
    expect(options.redirect).toBe('manual')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('falls back to GET when HEAD is not allowed', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ status: 405, statusText: 'Method Not Allowed' }))
      .mockResolvedValueOnce(mockResponse({
        status: 200,
        statusText: 'OK',
        headers: { server: 'test' },
        url: 'https://example.com/'
      }))

    const result = await fetchHeaders('https://example.com/')

    expect(result.status).toBe(200)
    expect(result.headers.server).toBe('test')
    expect(fetchSpy.mock.calls.map(call => (call[1] as RequestInit).method)).toEqual(['HEAD', 'GET'])
    expect((fetchSpy.mock.calls[1] as [URL, RequestInit])[1].redirect).toBe('manual')
  })

  it('falls back to GET when HEAD is not implemented', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ status: 501, statusText: 'Not Implemented' }))
      .mockResolvedValueOnce(mockResponse({
        status: 204,
        statusText: 'No Content',
        url: 'https://example.com/'
      }))

    const result = await fetchHeaders('https://example.com/')

    expect(result.status).toBe(204)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('keeps a HEAD 404 and does not fall back to GET', async () => {
    fetchSpy.mockResolvedValue(mockResponse({
      status: 404,
      statusText: 'Not Found',
      url: 'https://example.com/missing'
    }))

    const result = await fetchHeaders('https://example.com/missing')

    expect(result.status).toBe(404)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('cancels the GET body after headers', async () => {
    const cancel = mock(() => Promise.resolve())
    const getResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'x-test': '1' }),
      url: 'https://example.com/',
      body: { cancel }
    } as unknown as Response

    fetchSpy
      .mockResolvedValueOnce(mockResponse({ status: 405 }))
      .mockResolvedValueOnce(getResponse)

    await fetchHeaders('https://example.com/')

    expect(cancel).toHaveBeenCalled()
  })

  it('maps a timeout to a clear error', async () => {
    fetchSpy.mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'))

    await expect(fetchHeaders('https://example.com/')).rejects.toThrow('The request timed out.')
  })

  it('maps a network failure to a clear error', async () => {
    fetchSpy.mockRejectedValue(new Error('Unable to connect'))

    await expect(fetchHeaders('https://example.com/')).rejects.toThrow('The request failed.')
  })
})

describe('walkRedirects', () => {
  let lookup: ReturnType<typeof spyOn<typeof Bun.dns, 'lookup'>>
  let fetchSpy: ReturnType<typeof spyOn<typeof Bun, 'fetch'>>

  beforeEach(() => {
    lookup = spyOn(Bun.dns, 'lookup').mockResolvedValue([
      { address: '93.184.216.34', family: 4, ttl: 0 }
    ])
    fetchSpy = spyOn(Bun, 'fetch')
  })

  afterEach(() => {
    lookup.mockRestore()
    fetchSpy.mockRestore()
  })

  it('returns the hop chain for followed redirects', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({
        status: 302,
        statusText: 'Found',
        headers: { Location: 'https://example.com/next' },
        url: 'https://example.com/start'
      }))
      .mockResolvedValueOnce(mockResponse({
        status: 301,
        statusText: 'Moved Permanently',
        headers: { Location: '/final' },
        url: 'https://example.com/next'
      }))
      .mockResolvedValueOnce(mockResponse({
        status: 200,
        statusText: 'OK',
        url: 'https://example.com/final'
      }))

    const result = await walkRedirects('https://example.com/start')

    expect(result).toEqual([
      {
        url: 'https://example.com/start',
        status: 302,
        location: 'https://example.com/next'
      },
      {
        url: 'https://example.com/next',
        status: 301,
        location: '/final'
      },
      {
        url: 'https://example.com/final',
        status: 200
      }
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const [url, options] = fetchSpy.mock.calls[0] as [URL, RequestInit]
    expect(url.href).toBe('https://example.com/start')
    expect(options.redirect).toBe('manual')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('stops at maxRedirects', async () => {
    for (let index = 0; index < 8; index++) {
      fetchSpy.mockResolvedValueOnce(mockResponse({
        status: 302,
        statusText: 'Found',
        headers: { Location: `https://example.com/${index + 1}` },
        url: `https://example.com/${index}`
      }))
    }

    const result = await walkRedirects('https://example.com/0')

    expect(result).toHaveLength(6)
    expect(result.map(hop => hop.url)).toEqual([
      'https://example.com/0',
      'https://example.com/1',
      'https://example.com/2',
      'https://example.com/3',
      'https://example.com/4',
      'https://example.com/5'
    ])
    expect(result[5]?.location).toBe('https://example.com/6')
    expect(fetchSpy).toHaveBeenCalledTimes(6)
    expect(
      fetchSpy.mock.calls.map(call => (call[0] as URL).href)
    ).not.toContain('https://example.com/6')
  })

  it('blocks a private Location before the next fetch', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({
      status: 302,
      statusText: 'Found',
      headers: { Location: 'http://127.0.0.1/secret' },
      url: 'https://example.com/'
    }))

    const result = await walkRedirects('https://example.com/')

    expect(result).toEqual([
      {
        url: 'https://example.com/',
        status: 302,
        location: 'http://127.0.0.1/secret'
      }
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect((fetchSpy.mock.calls[0] as [URL, RequestInit])[0].href).toBe('https://example.com/')
  })
})
