import { describe, expect, it } from 'vitest'
import {
  convertCurl,
  encodeUrlencodedParam,
  parseCurl,
  toAxios,
  toFetch,
  toGoHttp,
  toPythonRequests,
} from '#shared/utils/dev/curl-converter'

function noticeFlags(command: string): string[] {
  return parseCurl(command).notices.map(notice => notice.flag)
}

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

  it('reports an ignored flag for -b, -A, -F, and --json', () => {
    const cmd = 'curl https://api.example.com/x -b session=abc -A my-agent -F file=@photo.png --json {"a":1}'
    const flags = noticeFlags(cmd)
    expect(flags).toContain('-b')
    expect(flags).toContain('-A')
    expect(flags).toContain('-F')
    expect(flags).toContain('--json')
  })

  it('marks a security flag in the notice list', () => {
    const cmd = 'curl -k --proxy http://127.0.0.1:8080 --cert client.pem --key client.key https://api.example.com/x'
    const secure = parseCurl(cmd).notices.filter(notice => notice.security).map(notice => notice.flag)
    expect(secure).toEqual(['-k', '--proxy', '--cert', '--key'])
  })

  it('drops no security option in silence', () => {
    for (const flag of ['-k', '--insecure', '--cert client.pem', '--key client.key', '--proxy http://127.0.0.1:8080']) {
      const name = flag.split(' ')[0]!
      const notices = parseCurl(`curl ${flag} https://api.example.com/x`).notices
      expect(notices.map(notice => notice.flag)).toContain(name)
      expect(notices.every(notice => notice.security)).toBe(true)
    }

    // The code applies `-u`, so the output holds it and the notice list stays empty.
    const user = parseCurl('curl -u admin:secret123 https://api.example.com/x')
    expect(user.notices).toEqual([])
    expect(toFetch(user)).toContain('"Authorization": "Basic ')
    expect(toPythonRequests(user)).toContain('auth=("admin", "secret123")')
  })

  it('reports an unknown flag and keeps no notice for a clean command', () => {
    expect(noticeFlags('curl --frobnicate https://api.example.com/x')).toEqual(['--frobnicate'])
    expect(noticeFlags('curl -X POST https://api.example.com/x -d a=1')).toEqual([])
  })

  it('consumes the value of an ignored flag so the URL stays correct', () => {
    const res = parseCurl('curl -o report.json -m 30 https://api.example.com/x')
    expect(res.url).toBe('https://api.example.com/x')
    expect(res.notices.map(notice => notice.flag)).toEqual(['-o', '-m'])
  })

  it('reports a joined short flag such as -Amy-agent', () => {
    expect(noticeFlags('curl -Amy-agent https://api.example.com/x')).toEqual(['-A'])
  })

  it('url-encodes each form of --data-urlencode', () => {
    expect(encodeUrlencodedParam('a b&c')).toEqual({ part: 'a%20b%26c' })
    expect(encodeUrlencodedParam('=a b')).toEqual({ part: 'a%20b' })
    expect(encodeUrlencodedParam('q=a b/c')).toEqual({ part: 'q=a%20b%2Fc' })
    expect(encodeUrlencodedParam('q@body.txt')).toEqual({ part: 'q=<contents of body.txt>', file: 'body.txt' })
    expect(encodeUrlencodedParam('@body.txt')).toEqual({ part: '<contents of body.txt>', file: 'body.txt' })
  })

  it('url-encodes --data-urlencode values in a query string', () => {
    const res = parseCurl('curl -G https://api.example.com/search --data-urlencode "q=a b" --data-urlencode "tag=x&y"')
    expect(res.url).toBe('https://api.example.com/search?q=a%20b&tag=x%26y')
  })

  it('shows a placeholder and a notice for --data-urlencode with a file', () => {
    const res = parseCurl('curl -X POST https://api.example.com/x --data-urlencode q@body.txt')
    expect(res.data).toBe('q=<contents of body.txt>')
    expect(res.notices[0]?.flag).toBe('@body.txt')
    expect(res.notices[0]?.message).toContain('body.txt')
  })

  it('shows a placeholder and a notice for a @filename body', () => {
    const res = parseCurl('curl -X POST https://api.example.com/x -d @body.json')
    expect(res.data).toBe('<contents of body.json>')
    expect(res.notices[0]?.flag).toBe('@body.json')
    expect(res.notices[0]?.message).toContain('body.json')
    expect(toFetch(res)).toContain('<contents of body.json>')
  })

  it('keeps a literal @ value for --data-raw', () => {
    const res = parseCurl('curl -X POST https://api.example.com/x --data-raw @literal')
    expect(res.data).toBe('@literal')
    expect(res.notices).toEqual([])
  })

  it('masks an authorization header, a cookie, and a password', () => {
    const cmd = 'curl https://api.example.com/x -H "Authorization: Bearer secret-token" -H "Cookie: sid=abc123; theme=dark"'
    const masked = convertCurl(cmd, 'fetch', { maskCredentials: true })
    expect(masked).toContain('Bearer <redacted>')
    expect(masked).toContain('sid=<redacted>; theme=<redacted>')
    expect(masked).not.toContain('secret-token')
    expect(masked).not.toContain('abc123')

    const python = convertCurl('curl -u admin:secret123 https://api.example.com/x', 'python', { maskCredentials: true })
    expect(python).toContain('auth=("admin", "<redacted>")')
    expect(python).not.toContain('secret123')
  })

  it('keeps the credentials when the mask option is off', () => {
    const code = convertCurl('curl https://api.example.com/x -H "Authorization: Bearer secret-token"', 'fetch')
    expect(code).toContain('Bearer secret-token')
  })

  it('escapes quotes in headers during Go code generation', () => {
    const parsedWithQuotes = parseCurl('curl https://api.example.com -H "Content-Disposition: attachment; filename=\\"report.pdf\\""')
    const code = toGoHttp(parsedWithQuotes)
    expect(code).toContain('req.Header.Set("Content-Disposition", "attachment; filename=\\"report.pdf\\"")')
  })
})
