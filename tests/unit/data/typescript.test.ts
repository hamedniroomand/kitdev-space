import { describe, expect, it } from 'vitest'
import { jsonToTypeScript } from '#shared/utils/data/typescript'

describe('jsonToTypeScript', () => {
  it('merges an array of objects into a single interface with optional fields', () => {
    const input = [
      { a: 1 },
      { a: 2, b: 'x' },
    ]
    const output = jsonToTypeScript(input, 'Root')
    expect(output).toContain('interface RootItem {')
    expect(output).toContain('a: number')
    expect(output).toContain('b?: string')
    expect(output).not.toContain('RootItem2')
    expect(output).toContain('type Root = RootItem[]')
  })

  it('handles simple objects', () => {
    const input = { id: 1, name: 'KitDev' }
    const output = jsonToTypeScript(input, 'User')
    expect(output).toContain('interface User {')
    expect(output).toContain('id: number')
    expect(output).toContain('name: string')
  })
})
