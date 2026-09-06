import { describe, expect, it } from 'vitest'
import { jsonToTypeScript } from '#shared/utils/data/typescript'
import { parseJson } from '#shared/utils/data/json'

describe('jsonToTypeScript', () => {
  it('builds a root interface', () => {
    const value = parseJson('{"id":10,"name":"Hamed","active":true}')
    const result = jsonToTypeScript(value)
    expect(result).toContain('interface Root')
    expect(result).toContain('id: number')
    expect(result).toContain('name: string')
    expect(result).toContain('active: boolean')
  })

  it('handles arrays of objects', () => {
    const value = parseJson('[{"id":1}]')
    const result = jsonToTypeScript(value)
    expect(result).toMatch(/interface /)
    expect(result).toContain('id: number')
  })
})
