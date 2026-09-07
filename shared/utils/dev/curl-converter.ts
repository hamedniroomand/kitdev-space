export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  data?: string
  auth?: { username: string, password?: string }
}

export type CurlTargetLanguage = 'fetch' | 'axios' | 'python' | 'go'

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
  let data: string | undefined
  let auth: { username: string, password?: string } | undefined

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!

    if (token === 'curl') {
      continue
    }

    if (token === '-X' || token === '--request') {
      method = (tokens[++i] || '').toUpperCase()
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
    else if (
      token === '-d'
      || token === '--data'
      || token === '--data-raw'
      || token === '--data-binary'
      || token === '--data-urlencode'
    ) {
      const val = tokens[++i] || ''
      data = data ? `${data}&${val}` : val
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
    else if (token === '--url') {
      url = tokens[++i] || ''
    }
    else if (!token.startsWith('-') && !url) {
      url = token
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
    headersCode += `\treq.Header.Set("${k}", "${v}")\n`
  }

  if (parsed.auth) {
    headersCode += `\treq.SetBasicAuth("${parsed.auth.username}", "${parsed.auth.password || ''}")\n`
  }

  return `package main

${imports}

func main() {
\tclient := &http.Client{}
\treq, err := http.NewRequest("${parsed.method}", "${parsed.url}", ${bodyCode})
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

export function convertCurl(curlCommand: string, target: CurlTargetLanguage): string {
  const parsed = parseCurl(curlCommand)
  if (!parsed.url) {
    throw new Error('Could not find URL in curl command.')
  }

  switch (target) {
    case 'fetch':
      return toFetch(parsed)
    case 'axios':
      return toAxios(parsed)
    case 'python':
      return toPythonRequests(parsed)
    case 'go':
      return toGoHttp(parsed)
    default:
      throw new Error(`Unsupported target language: ${target}`)
  }
}
