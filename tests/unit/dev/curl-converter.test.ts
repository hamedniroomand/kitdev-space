import { describe, expect, it } from 'vitest'
import {
  convertCurl,
  parseCurl,
  toAxios,
  toFetch,
  toGoHttp,
  toPythonRequests,
} from '#shared/utils/dev/curl-converter'

describe('parseCurl', () => {
  it('parses basic GET command', () => {
    const res = parseCurl('curl https://api.example.com/items')
    expect(res.url).toBe('https://api.example.com/items')
    expect(res.method).toBe('GET')
    expect(res.headers).toEqual({})
  })

  it('parses POST command with headers and json payload', () => {
    const cmd = `curl -X POST https://api.example.com/users -H "Content-Type: application/json" -H "Authorization: Bearer test-token" -d '{"name": "Alice"}'`
    const res = parseCurl(cmd)
    expect(res.url).toBe('https://api.example.com/users')
    expect(res.method).toBe('POST')
    expect(res.headers['Content-Type']).toBe('application/json')
    expect(res.headers.Authorization).toBe('Bearer test-token')
    expect(res.data).toBe('{"name": "Alice"}')
  })

  it('parses basic authentication', () => {
    const cmd = 'curl -u admin:secret123 https://api.example.com/secure'
    const res = parseCurl(cmd)
    expect(res.auth).toEqual({ username: 'admin', password: 'secret123' })
  })
})

describe('converters', () => {
  const parsed = parseCurl('curl -X POST https://httpbin.org/post -H "Content-Type: application/json" -d \'{"key":"value"}\'')

  it('converts to JavaScript fetch', () => {
    const code = toFetch(parsed)
    expect(code).toContain('fetch("https://httpbin.org/post"')
    expect(code).toContain('method: "POST"')
    expect(code).toContain('"Content-Type": "application/json"')
  })

  it('converts to Axios', () => {
    const code = toAxios(parsed)
    expect(code).toContain('import axios from \'axios\'')
    expect(code).toContain('url: "https://httpbin.org/post"')
    expect(code).toContain('method: "post"')
  })

  it('converts to Python requests with booleans and nulls', () => {
    const complexParsed = parseCurl('curl -X POST https://httpbin.org/post -H "Content-Type: application/json" -d \'{"active": true, "deleted": false, "notes": null, "count": 42}\'')
    const code = toPythonRequests(complexParsed)
    expect(code).toContain('"active": True')
    expect(code).toContain('"deleted": False')
    expect(code).toContain('"notes": None')
    expect(code).toContain('"count": 42')
    expect(code).not.toContain('true')
    expect(code).not.toContain('false')
    expect(code).not.toContain('null')
  })

  it('converts to Python requests', () => {
    const code = toPythonRequests(parsed)
    expect(code).toContain('import requests')
    expect(code).toContain('requests.post')
    expect(code).toContain('json=json_data')
  })

  it('converts to Go net/http', () => {
    const code = toGoHttp(parsed)
    expect(code).toContain('package main')
    expect(code).toContain('http.NewRequest("POST", "https://httpbin.org/post"')
  })

  it('converts via convertCurl helper', () => {
    const code = convertCurl('curl https://api.example.com', 'fetch')
    expect(code).toContain('fetch("https://api.example.com"')
  })

  it('parses joined short flags such as -XPOST and -d', () => {
    const res = parseCurl('curl -XPOST https://api.example.com/item -dfoo=bar')
    expect(res.method).toBe('POST')
    expect(res.data).toBe('foo=bar')
  })

  it('converts curl -G with -d to GET with query params', () => {
    const res = parseCurl('curl -G https://api.example.com/search -d q=hello -d page=1')
    expect(res.method).toBe('GET')
    expect(res.url).toBe('https://api.example.com/search?q=hello&page=1')
    expect(res.data).toBeUndefined()
  })

  it('escapes quotes in headers during Go code generation', () => {
    const parsedWithQuotes = parseCurl('curl https://api.example.com -H "Content-Disposition: attachment; filename=\\"report.pdf\\""')
    const code = toGoHttp(parsedWithQuotes)
    expect(code).toContain('req.Header.Set("Content-Disposition", "attachment; filename=\\"report.pdf\\"")')
  })
})
