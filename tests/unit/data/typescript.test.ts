import { describe, expect, it } from 'vitest'
import { jsonToTypeScript } from '#shared/utils/data/typescript'
import nested from './fixtures-nested.json'

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

describe('jsonToTypeScript naming', () => {
  const output = jsonToTypeScript(nested, 'Root')

  it('emits one interface per distinct shape, not one per occurrence', () => {
    expect(output.match(/^interface Category \{/gm)).toHaveLength(1)
    expect(output).not.toMatch(/interface Category\d/)
  })

  it('names interfaces after their key, not the full path', () => {
    expect(output).not.toContain('RootData')
    expect(output).toContain('interface Data {')
    expect(output).toContain('interface ActiveProject {')
    expect(output).toContain('interface AllProject {')
    expect(output).toContain('category: Category')
    expect(output).toContain('active_projects: ActiveProject[]')
    expect(output).toContain('all_projects: AllProject[]')
  })

  it('disambiguates same-key different-shape objects with the parent key', () => {
    expect(output).toContain('interface ActiveProjectsProject {')
    expect(output).toContain('interface AllProjectsProject {')
    expect(output).toContain('projects: ActiveProjectsProject[]')
    expect(output).toContain('projects: AllProjectsProject[]')
    expect(output).toContain('completion: number')
  })

  it('pascalCases every underscore-separated word in a key', () => {
    const output = jsonToTypeScript({ my_long_key_name: [{ a: 1 }], list: [] }, 'Root')
    expect(output).toContain('interface MyLongKeyName {')
    expect(output).toContain('my_long_key_name: MyLongKeyName[]')
    expect(output).toContain('list: unknown[]')
  })

  it('keeps children before parents and the root last', () => {
    const names = [...output.matchAll(/^interface (\w+) \{/gm)].map(m => m[1])
    expect(names.indexOf('Category')).toBeLessThan(names.indexOf('ActiveProject'))
    expect(names.at(-1)).toBe('Root')
  })
})
