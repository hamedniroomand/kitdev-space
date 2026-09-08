import { describe, expect, it } from 'vitest'
import { buildJsonPath, flattenJsonTree } from '#shared/utils/data/json-tree'

describe('json-tree', () => {
  describe('buildJsonPath', () => {
    it('builds path for standard identifier key', () => {
      expect(buildJsonPath('$', 'name')).toBe('$.name')
      expect(buildJsonPath('$.user', 'address')).toBe('$.user.address')
    })

    it('builds path for numeric array index', () => {
      expect(buildJsonPath('$', 0)).toBe('$[0]')
      expect(buildJsonPath('$.users', 2)).toBe('$.users[2]')
    })

    it('builds bracket path for special character key', () => {
      expect(buildJsonPath('$', 'full-name')).toBe('$[\'full-name\']')
      expect(buildJsonPath('$', 'foo bar')).toBe('$[\'foo bar\']')
    })
  })

  describe('flattenJsonTree', () => {
    it('flattens primitive root value', () => {
      const nodes = flattenJsonTree('hello')
      expect(nodes).toHaveLength(1)
      expect(nodes[0]?.path).toBe('$')
      expect(nodes[0]?.type).toBe('string')
      expect(nodes[0]?.hasChildren).toBe(false)
    })

    it('flattens simple object with correct paths and depths', () => {
      const data = { name: 'KitDev', count: 42 }
      const nodes = flattenJsonTree(data)
      expect(nodes).toHaveLength(3)
      expect(nodes[0]?.path).toBe('$')
      expect(nodes[0]?.depth).toBe(0)
      expect(nodes[0]?.childCount).toBe(2)

      expect(nodes[1]?.path).toBe('$.name')
      expect(nodes[1]?.depth).toBe(1)
      expect(nodes[1]?.value).toBe('KitDev')

      expect(nodes[2]?.path).toBe('$.count')
      expect(nodes[2]?.depth).toBe(1)
      expect(nodes[2]?.value).toBe(42)
    })

    it('collapses nodes beyond depth level 2 by default', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      const nodes = flattenJsonTree(data)
      const paths = nodes.map(n => n.path)
      expect(paths).toContain('$')
      expect(paths).toContain('$.level1')
      expect(paths).toContain('$.level1.level2')
      // level2 is at depth 2 and collapsed by default, so level3 is not walked
      expect(paths).not.toContain('$.level1.level2.level3')
    })

    it('expands collapsed node when specified in state', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      const nodes = flattenJsonTree(data, { '$.level1.level2': false })
      const paths = nodes.map(n => n.path)
      expect(paths).toContain('$.level1.level2')
      expect(paths).toContain('$.level1.level2.level3')
    })

    it('supports 10,000 items efficiently without freezing', () => {
      const largeArray = Array.from({ length: 10_000 }, (_, i) => i)
      const start = performance.now()
      const nodes = flattenJsonTree(largeArray)
      const elapsed = performance.now() - start
      expect(nodes).toHaveLength(10_001)
      expect(elapsed).toBeLessThan(100)
    })
  })
})
