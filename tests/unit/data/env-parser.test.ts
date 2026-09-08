import { describe, expect, it } from 'vitest'
import { envToExample, envToJson, envToJsonWithDiagnostics, jsonToEnv, maskEnvValues } from '#shared/utils/data/env-parser'

describe('env-parser', () => {
  it('parses .env with comments, export prefixes, and quotes into JSON', () => {
    const env = `
# Server configuration
export PORT=3000
HOST=localhost # Default host
API_KEY="secret-123"
MULTILINE="Line 1\\nLine 2"
`
    const json = envToJson(env)
    expect(json.PORT).toBe('3000')
    expect(json.HOST).toBe('localhost')
    expect(json.API_KEY).toBe('secret-123')
    expect(json.MULTILINE).toBe('Line 1\nLine 2')
  })

  it('converts JSON object back to .env format', () => {
    const obj = {
      APP_NAME: 'KitDev Space',
      PORT: 3000,
      DEBUG: true,
    }
    const env = jsonToEnv(obj)
    expect(env).toContain('APP_NAME="KitDev Space"')
    expect(env).toContain('PORT=3000')
    expect(env).toContain('DEBUG=true')
  })
})

describe('envToJsonWithDiagnostics', () => {
  it('reports line numbers for duplicate keys', () => {
    const env = 'KEY=first\nKEY=second'
    const result = envToJsonWithDiagnostics(env)
    expect(result.data.KEY).toBe('second')
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('warning')
    expect(result.diagnostics[0].line).toBe(2)
    expect(result.diagnostics[0].message).toContain('first seen at line 1')
  })

  it('reports error for a line with no = sign', () => {
    const env = 'BADLINE'
    const result = envToJsonWithDiagnostics(env)
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
    expect(result.diagnostics[0].line).toBe(1)
  })

  it('reports error for unclosed double quote', () => {
    const env = 'KEY="unclosed'
    const result = envToJsonWithDiagnostics(env)
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
    expect(result.diagnostics[0].message).toContain('Unclosed double quote')
  })

  it('unescapes backslash sequences in double-quoted values', () => {
    const env = 'KEY="line1\\nline2\\\\end"'
    const result = envToJsonWithDiagnostics(env)
    expect(result.data.KEY).toBe('line1\nline2\\end')
    expect(result.diagnostics).toHaveLength(0)
  })

  it('round-trips multiline double-quoted values correctly', () => {
    const env = 'MSG="hello\\nworld"'
    const data = envToJson(env)
    const back = jsonToEnv(data)
    const reparsed = envToJson(back)
    expect(reparsed.MSG).toBe('hello\nworld')
  })

  it('keeps blank lines and comments in diagnostics output unchanged', () => {
    const env = '# comment\nKEY=value\n'
    const result = envToJsonWithDiagnostics(env)
    expect(result.data.KEY).toBe('value')
    expect(result.diagnostics).toHaveLength(0)
  })

  it('does not silently drop an invalid line', () => {
    const env = 'VALID=ok\nINVALID_NO_EQUALS\nOTHER=also'
    const result = envToJsonWithDiagnostics(env)
    expect(result.data.VALID).toBe('ok')
    expect(result.data.OTHER).toBe('also')
    expect(result.diagnostics[0].line).toBe(2)
  })
})

describe('jsonToEnv', () => {
  it('rejects a JSON array with a clear error message', () => {
    expect(() => jsonToEnv('[]')).toThrow(/object/)
  })

  it('rejects a JSON string with a clear error message', () => {
    expect(() => jsonToEnv('"just a string"')).toThrow(/object/)
  })
})

describe('envToExample', () => {
  it('strips values while keeping keys, comments, and blanks', () => {
    const env = '# comment\nSECRET=password123\nPORT=3000\n'
    const example = envToExample(env)
    expect(example).toContain('# comment')
    expect(example).toContain('SECRET=')
    expect(example).not.toContain('password123')
    expect(example).toContain('PORT=')
    expect(example).not.toContain('3000')
  })

  it('never leaves secret values in the example output', () => {
    const env = 'DB_PASS=hunter2\nAPI_SECRET=abc123'
    const example = envToExample(env)
    expect(example).not.toContain('hunter2')
    expect(example).not.toContain('abc123')
  })

  it('preserves the export prefix', () => {
    const env = 'export REDIS_URL=redis://localhost'
    const example = envToExample(env)
    expect(example).toBe('export REDIS_URL=')
  })
})

describe('maskEnvValues', () => {
  it('replaces all values with ***', () => {
    const data = { SECRET: 'password', PORT: '3000' }
    const masked = maskEnvValues(data)
    expect(masked.SECRET).toBe('***')
    expect(masked.PORT).toBe('***')
  })

  it('preserves all keys', () => {
    const data = { A: '1', B: '2' }
    expect(Object.keys(maskEnvValues(data))).toEqual(['A', 'B'])
  })
})
