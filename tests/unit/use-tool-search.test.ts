import { describe, expect, it } from 'vitest'
import { searchTools } from '#shared/utils/tools'

describe('searchTools', () => {
  it('returns all tools for an empty query', () => {
    expect(searchTools('').length).toBeGreaterThan(0)
  })

  it('matches crypto tools by category id', () => {
    const results = searchTools('crypto')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(tool =>
      tool.category === 'crypto'
      || tool.keywords.includes('crypto')
      || tool.name.toLowerCase().includes('crypto')
      || tool.description.toLowerCase().includes('crypto'),
    )).toBe(true)
  })
})
