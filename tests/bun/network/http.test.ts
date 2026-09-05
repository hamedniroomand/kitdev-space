import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { fetchHeaders } from '../../../server/utils/network/http'

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
