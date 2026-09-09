/** One cURL option that the generated code does not apply. */
export interface CurlNotice {
  /** The option as cURL writes it, such as `-b` or `--json`. */
  flag: string
  message: string
  /** True when the option changes credentials, the proxy, or the TLS check. */
  security: boolean
}

export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  data?: string
  auth?: { username: string, password?: string }
  notices: CurlNotice[]
}

export type CurlTargetLanguage = 'fetch' | 'axios' | 'python' | 'go'

export interface CurlConvertOptions {
  /** Replace the token in an Authorization header, a cookie, and a password. */
  maskCredentials?: boolean
}

interface IgnoredFlag {
  names: string[]
  takesValue: boolean
  security?: boolean
  message: string
}

/** Options that cURL accepts and the generated code does not apply. */
const IGNORED_FLAGS: IgnoredFlag[] = [
  { names: ['-b', '--cookie'], takesValue: true, security: true, message: 'The code sends no cookie. Add a Cookie header.' },
  { names: ['-c', '--cookie-jar'], takesValue: true, message: 'The code saves no cookie file.' },
  { names: ['-A', '--user-agent'], takesValue: true, message: 'The code sets no user agent. Add a User-Agent header.' },
  { names: ['-e', '--referer'], takesValue: true, message: 'The code sets no referrer. Add a Referer header.' },
  { names: ['-F', '--form', '--form-string'], takesValue: true, message: 'The code sends no multipart body. Build a FormData body.' },
  { names: ['--json'], takesValue: true, message: 'The code sends no body for this option. Use -d and a Content-Type header.' },
  { names: ['-T', '--upload-file'], takesValue: true, message: 'The code uploads no file.' },
  { names: ['-o', '--output'], takesValue: true, message: 'The code saves no response file.' },
  { names: ['-O', '--remote-name'], takesValue: false, message: 'The code saves no response file.' },
  { names: ['-D', '--dump-header'], takesValue: true, message: 'The code saves no response headers.' },
  { names: ['-w', '--write-out'], takesValue: true, message: 'The code prints no report.' },
  { names: ['-m', '--max-time', '--connect-timeout'], takesValue: true, message: 'The code sets no timeout.' },
  { names: ['--retry'], takesValue: true, message: 'The code makes no retry.' },
  { names: ['-x', '--proxy', '--preproxy'], takesValue: true, security: true, message: 'The code uses no proxy. The request goes direct.' },
  { names: ['-U', '--proxy-user'], takesValue: true, security: true, message: 'The code drops the proxy credentials.' },
  { names: ['-E', '--cert'], takesValue: true, security: true, message: 'The code uses no client certificate.' },
  { names: ['--key'], takesValue: true, security: true, message: 'The code uses no client key.' },
  { names: ['--cacert', '--capath'], takesValue: true, security: true, message: 'The code uses no custom certificate authority.' },
  { names: ['-k', '--insecure'], takesValue: false, security: true, message: 'The code validates the TLS certificate. It does not skip the check.' },
  { names: ['-C', '--continue-at'], takesValue: true, message: 'The code makes no resumed transfer.' },
  { names: ['-r', '--range'], takesValue: true, message: 'The code sets no Range header.' },
  { names: ['--limit-rate'], takesValue: true, message: 'The code sets no rate limit.' },
  { names: ['--resolve'], takesValue: true, message: 'The code uses no custom host address.' },
  { names: ['--interface'], takesValue: true, message: 'The code selects no network interface.' },
  { names: ['--max-redirs'], takesValue: true, message: 'The code sets no redirect limit.' },
  { names: ['-L', '--location'], takesValue: false, message: 'The code sets no redirect option. Check the default of the client.' },
  { names: ['--compressed'], takesValue: false, message: 'The code sets no Accept-Encoding header.' },
  { names: ['-I', '--head'], takesValue: false, message: 'The code uses no HEAD method. Set the method to HEAD in the code.' },
  {
    names: ['-s', '--silent', '-S', '--show-error', '-v', '--verbose', '-i', '--include', '-f', '--fail', '--fail-with-body', '-#', '--progress-bar', '--no-progress-meter', '-N', '--no-buffer'],
    takesValue: false,
    message: 'This option changes the terminal output only.',
  },
  {
    names: ['-g', '--globoff', '-4', '--ipv4', '-6', '--ipv6', '--http1.1', '--http2', '--http3', '--no-keepalive', '--tlsv1.2', '--tlsv1.3', '-Z', '--parallel'],
    takesValue: false,
    message: 'The code uses the transport defaults of the client.',
  },
]

const IGNORED_BY_NAME = new Map<string, IgnoredFlag>(
  IGNORED_FLAGS.flatMap(flag => flag.names.map(name => [name, flag] as const)),
)

/** cURL reads the file. This tool never reads a file, so the code gets a placeholder. */
export function curlFilePlaceholder(file: string): string {
  return `<contents of ${file}>`
}

/**
 * Apply one `--data-urlencode` value.
 * cURL accepts `content`, `=content`, `name=content`, `@file`, and `name@file`.
 */
export function encodeUrlencodedParam(spec: string): { part: string, file?: string } {
  if (spec.startsWith('=')) {
    return { part: encodeURIComponent(spec.slice(1)) }
  }
  if (spec.startsWith('@')) {
    const file = spec.slice(1)
    return { part: curlFilePlaceholder(file), file }
  }

  const equals = spec.indexOf('=')
  const at = spec.indexOf('@')

  if (equals !== -1 && (at === -1 || equals < at)) {
    return { part: `${spec.slice(0, equals)}=${encodeURIComponent(spec.slice(equals + 1))}` }
  }
  if (at !== -1) {
    const file = spec.slice(at + 1)
    return { part: `${spec.slice(0, at)}=${curlFilePlaceholder(file)}`, file }
  }
  return { part: encodeURIComponent(spec) }
}

export function tokenizeCurl(cmd: string): string[] {
  // Replace line continuations (backslash before newline)
  const normalized = cmd.replace(/\\\r?\n/g, ' ').trim()
  const tokens: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let escaped = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]!

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && !inSingle) {
      escaped = true
      continue
    }

    if (char === '\'' && !inDouble) {
      inSingle = !inSingle
      continue
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }

    if (/\s/.test(char) && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current)
        current = ''
      }
    }
    else {
      current += char
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

export function parseCurl(curlCommand: string): ParsedCurl {
  const tokens = tokenizeCurl(curlCommand)

  let url = ''
  let method = ''
  const headers: Record<string, string> = {}
  const dataParts: string[] = []
  let auth: { username: string, password?: string } | undefined
  let isGetFlag = false
  const notices: CurlNotice[] = []
  const seenNotices = new Set<string>()

  function addNotice(flag: string, message: string, security = false) {
    const key = `${flag}|${message}`
    if (seenNotices.has(key)) {
      return
    }
    seenNotices.add(key)
    notices.push({ flag, message, security })
  }

  function addFileNotice(file: string) {
    addNotice(`@${file}`, `The tool reads no local file. Replace the placeholder with the content of ${file}.`)
  }

  function addData(value: string, allowFile: boolean) {
    if (allowFile && value.startsWith('@')) {
      const file = value.slice(1)
      dataParts.push(curlFilePlaceholder(file))
      addFileNotice(file)
      return
    }
    dataParts.push(value)
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!

    if (token === 'curl') {
      continue
    }

    if (token === '-G' || token === '--get') {
      isGetFlag = true
    }
    else if (token === '-X' || token === '--request') {
      method = (tokens[++i] || '').toUpperCase()
    }
    else if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase()
    }
    else if (token === '-H' || token === '--header') {
      const headerLine = tokens[++i] || ''
      const colonIndex = headerLine.indexOf(':')
      if (colonIndex !== -1) {
        const key = headerLine.slice(0, colonIndex).trim()
        const value = headerLine.slice(colonIndex + 1).trim()
        headers[key] = value
      }
    }
    else if (token.startsWith('-H') && token.length > 2) {
      const headerLine = token.slice(2)
      const colonIndex = headerLine.indexOf(':')
      if (colonIndex !== -1) {
        const key = headerLine.slice(0, colonIndex).trim()
        const value = headerLine.slice(colonIndex + 1).trim()
        headers[key] = value
      }
    }
    else if (
      token === '-d'
      || token === '--data'
      || token === '--data-raw'
      || token === '--data-ascii'
      || token === '--data-binary'
    ) {
      addData(tokens[++i] || '', token !== '--data-raw')
    }
    else if (token === '--data-urlencode') {
      const { part, file } = encodeUrlencodedParam(tokens[++i] || '')
      dataParts.push(part)
      if (file) {
        addFileNotice(file)
      }
    }
    else if (token.startsWith('-d') && token.length > 2) {
      addData(token.slice(2), true)
    }
    else if (token === '-u' || token === '--user') {
      const userpass = tokens[++i] || ''
      const colonIdx = userpass.indexOf(':')
      if (colonIdx !== -1) {
        auth = {
          username: userpass.slice(0, colonIdx),
          password: userpass.slice(colonIdx + 1),
        }
      }
      else {
        auth = { username: userpass }
      }
    }
    else if (token.startsWith('-u') && token.length > 2) {
      const userpass = token.slice(2)
      const colonIdx = userpass.indexOf(':')
      if (colonIdx !== -1) {
        auth = {
          username: userpass.slice(0, colonIdx),
          password: userpass.slice(colonIdx + 1),
        }
      }
      else {
        auth = { username: userpass }
      }
    }
    else if (token === '--url') {
      url = tokens[++i] || ''
    }
    else if (IGNORED_BY_NAME.has(token)) {
      const flag = IGNORED_BY_NAME.get(token)!
      if (flag.takesValue) {
        i++
      }
      addNotice(token, flag.message, flag.security === true)
    }
    else if (token.startsWith('-') && token.length > 1) {
      // A joined short option, such as `-Acurl/8.0`, holds its value in the same token.
      const joined = token.startsWith('--') ? undefined : IGNORED_BY_NAME.get(token.slice(0, 2))
      if (joined?.takesValue) {
        addNotice(token.slice(0, 2), joined.message, joined.security === true)
      }
      else {
        addNotice(token, 'The tool does not know this option. Check the cURL command.')
      }
    }
    else if (!url) {
      url = token
    }
  }

  let data: string | undefined = dataParts.length > 0 ? dataParts.join('&') : undefined

  if (isGetFlag) {
    method = method || 'GET'
    if (data) {
      const sep = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?'
      url = `${url}${sep}${data}`
      data = undefined
    }
  }

  // Infer method
  if (!method) {
    method = data ? 'POST' : 'GET'
  }

  return {
    url,
    method,
    headers,
    data,
    auth,
    notices,
  }
}

export const CURL_REDACTED = '<redacted>'

const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie'])

function maskHeaderValue(name: string, value: string): string {
  if (name.toLowerCase() === 'cookie') {
    return value
      .split(';')
      .map((pair) => {
        const equals = pair.indexOf('=')
        if (equals === -1) {
          return CURL_REDACTED
        }
        return `${pair.slice(0, equals).trim()}=${CURL_REDACTED}`
      })
      .join('; ')
  }

  const scheme = value.split(/\s+/)[0] ?? ''
  return scheme && scheme !== value ? `${scheme} ${CURL_REDACTED}` : CURL_REDACTED
}

/** Replace the secret in an Authorization header, a cookie, and a password. */
export function maskCurlCredentials(parsed: ParsedCurl): ParsedCurl {
  const headers: Record<string, string> = {}
  for (const [name, value] of Object.entries(parsed.headers)) {
    headers[name] = SENSITIVE_HEADERS.has(name.toLowerCase())
      ? maskHeaderValue(name, value)
      : value
  }

  return {
    ...parsed,
    headers,
    auth: parsed.auth ? { ...parsed.auth, password: CURL_REDACTED } : undefined,
  }
}

export function toFetch(parsed: ParsedCurl): string {
  const options: Record<string, unknown> = {
    method: parsed.method,
  }

  const headers = { ...parsed.headers }
  if (parsed.auth) {
    const encoded = btoa(`${parsed.auth.username}:${parsed.auth.password || ''}`)
    headers.Authorization = `Basic ${encoded}`
  }

  if (Object.keys(headers).length > 0) {
    options.headers = headers
  }

  let bodyStr = ''
  if (parsed.data) {
    try {
      // Check if data is valid JSON
      const json = JSON.parse(parsed.data)
      bodyStr = `\n  body: JSON.stringify(${JSON.stringify(json, null, 4).replace(/\n/g, '\n  ')})`
    }
    catch {
      bodyStr = `\n  body: ${JSON.stringify(parsed.data)}`
    }
  }

  const headersStr = Object.keys(headers).length > 0
    ? `\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},`
    : ''

  return `fetch("${parsed.url}", {
  method: "${parsed.method}",${headersStr}${bodyStr}
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`
}

export function toAxios(parsed: ParsedCurl): string {
  const headers = { ...parsed.headers }
  if (parsed.auth) {
    const encoded = btoa(`${parsed.auth.username}:${parsed.auth.password || ''}`)
    headers.Authorization = `Basic ${encoded}`
  }

  const configParts: string[] = [`method: "${parsed.method.toLowerCase()}"`, `url: "${parsed.url}"`]

  if (Object.keys(headers).length > 0) {
    configParts.push(`headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')}`)
  }

  if (parsed.data) {
    try {
      const json = JSON.parse(parsed.data)
      configParts.push(`data: ${JSON.stringify(json, null, 2).replace(/\n/g, '\n  ')}`)
    }
    catch {
      configParts.push(`data: ${JSON.stringify(parsed.data)}`)
    }
  }

  return `import axios from 'axios';

axios({
  ${configParts.join(',\n  ')}
})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error);
  });`
}

export function toPythonLiteral(value: unknown, indent = 0): string {
  if (value === null || value === undefined) {
    return 'None'
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  const spaces = ' '.repeat(indent)
  const nextSpaces = ' '.repeat(indent + 4)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    const items = value.map(item => `${nextSpaces}${toPythonLiteral(item, indent + 4)}`)
    return `[\n${items.join(',\n')}\n${spaces}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return '{}'
    }
    const lines = entries.map(([k, v]) => `${nextSpaces}${JSON.stringify(k)}: ${toPythonLiteral(v, indent + 4)}`)
    return `{\n${lines.join(',\n')}\n${spaces}}`
  }

  return JSON.stringify(value)
}

export function toPythonRequests(parsed: ParsedCurl): string {
  const lines: string[] = ['import requests\n']
  lines.push(`url = "${parsed.url}"\n`)

  if (Object.keys(parsed.headers).length > 0) {
    lines.push(`headers = ${toPythonLiteral(parsed.headers)}\n`)
  }

  let dataArg = ''
  if (parsed.data) {
    try {
      const json = JSON.parse(parsed.data)
      lines.push(`json_data = ${toPythonLiteral(json)}\n`)
      dataArg = ', json=json_data'
    }
    catch {
      lines.push(`data = ${JSON.stringify(parsed.data)}\n`)
      dataArg = ', data=data'
    }
  }

  let authArg = ''
  if (parsed.auth) {
    authArg = `, auth=("${parsed.auth.username}", "${parsed.auth.password || ''}")`
  }

  const headersArg = Object.keys(parsed.headers).length > 0 ? ', headers=headers' : ''
  const method = parsed.method.toLowerCase()

  lines.push(`response = requests.${method}(url${headersArg}${dataArg}${authArg})\n`)
  lines.push('print(response.json())')

  return lines.join('')
}

export function toGoHttp(parsed: ParsedCurl): string {
  let bodyCode = 'nil'
  let imports = `import (
\t"fmt"
\t"io"
\t"net/http"
)`

  if (parsed.data) {
    imports = `import (
\t"bytes"
\t"fmt"
\t"io"
\t"net/http"
)`
    bodyCode = `bytes.NewBuffer([]byte(${JSON.stringify(parsed.data)}))`
  }

  let headersCode = ''
  for (const [k, v] of Object.entries(parsed.headers)) {
    headersCode += `\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})\n`
  }

  if (parsed.auth) {
    headersCode += `\treq.SetBasicAuth(${JSON.stringify(parsed.auth.username)}, ${JSON.stringify(parsed.auth.password || '')})\n`
  }

  return `package main

${imports}

func main() {
\tclient := &http.Client{}
\treq, err := http.NewRequest(${JSON.stringify(parsed.method)}, ${JSON.stringify(parsed.url)}, ${bodyCode})
\tif err != nil {
\t\tpanic(err)
\t}

${headersCode}\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}
\tfmt.Println(string(body))
}`
}

export function generateCode(
  parsed: ParsedCurl,
  target: CurlTargetLanguage,
  options: CurlConvertOptions = {},
): string {
  if (!parsed.url) {
    throw new Error('Could not find URL in curl command.')
  }

  const source = options.maskCredentials ? maskCurlCredentials(parsed) : parsed

  switch (target) {
    case 'fetch':
      return toFetch(source)
    case 'axios':
      return toAxios(source)
    case 'python':
      return toPythonRequests(source)
    case 'go':
      return toGoHttp(source)
    default:
      throw new Error(`Unsupported target language: ${target}`)
  }
}

export function convertCurl(
  curlCommand: string,
  target: CurlTargetLanguage,
  options: CurlConvertOptions = {},
): string {
  return generateCode(parseCurl(curlCommand), target, options)
}
