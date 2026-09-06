import { describe, expect, it } from 'bun:test'
import { resolveSpecifiers } from '#server/utils/dev/ast'

describe('resolveSpecifiers directory confinement', () => {
  it('rejects an absolute path', () => {
    expect(() => resolveSpecifiers({
      directory: '/etc',
      specifiers: ['./passwd'],
    })).toThrow('relative to the project root')
  })

  it('rejects a path that climbs above the root', () => {
    expect(() => resolveSpecifiers({
      directory: '../../..',
      specifiers: ['vue'],
    })).toThrow('relative to the project root')
  })

  it('rejects a nested path that climbs above the root', () => {
    expect(() => resolveSpecifiers({
      directory: 'app/../../../etc',
      specifiers: ['vue'],
    })).toThrow('relative to the project root')
  })

  it('accepts a directory below the root', () => {
    const result = resolveSpecifiers({
      directory: 'app',
      specifiers: ['vue'],
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.specifier).toBe('vue')
  })

  it('reports a path relative to the root, not an absolute path', () => {
    const result = resolveSpecifiers({ specifiers: ['vue'] })
    const item = result[0]

    expect(item?.ok).toBe(true)
    expect(item?.path?.startsWith('/')).toBe(false)
    expect(item?.path).toContain('node_modules')
  })
})
