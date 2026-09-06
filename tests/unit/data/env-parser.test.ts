import { describe, expect, it } from 'vitest'
import { envToJson, jsonToEnv } from '#shared/utils/data/env-parser'

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
      DEBUG: true
    }
    const env = jsonToEnv(obj)
    expect(env).toContain('APP_NAME="KitDev Space"')
    expect(env).toContain('PORT=3000')
    expect(env).toContain('DEBUG=true')
  })
})
