import { describe, expect, it } from 'vitest'
import {
  categoryLabels,
  getAvailableTools,
  getPrimaryTools,
  getToolById,
  getToolsByCategory,
  searchTools,
  tools
} from '#shared/utils/tools'

describe('tool registry', () => {
  it('lists tools for each Phase 1 category', () => {
    expect(getToolsByCategory('data').length).toBeGreaterThan(0)
    expect(getToolsByCategory('crypto').length).toBeGreaterThan(0)
    expect(getToolsByCategory('color').length).toBeGreaterThan(0)
    expect(getToolsByCategory('network').length).toBeGreaterThan(0)
  })

  it('finds a tool by id', () => {
    const tool = getToolById('json-formatter')
    expect(tool?.route).toBe('/hub/data/json-formatter')
    expect(tool?.clientOnly).toBe(true)
  })

  it('searches by name and keywords', () => {
    const results = searchTools('yaml')
    expect(results.some(tool => tool.id === 'json-yaml')).toBe(true)
  })

  it('excludes coming-soon tools from available list', () => {
    expect(getAvailableTools().every(tool => tool.status === 'available')).toBe(true)
  })

  it('keeps unique ids and routes', () => {
    const ids = tools.map(tool => tool.id)
    const routes = tools.map(tool => tool.route)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('points every variant to a parent in the same category', () => {
    const variants = tools.filter(tool => tool.variantOf)
    expect(variants.length).toBeGreaterThan(0)
    for (const variant of variants) {
      const parent = getToolById(variant.variantOf!)
      expect(parent, variant.id).toBeDefined()
      expect(parent?.variantOf).toBeUndefined()
      expect(parent?.category).toBe(variant.category)
    }
  })

  it('hides variants from the category lists and the primary count', () => {
    expect(getToolsByCategory('crypto').some(tool => tool.id === 'uuid')).toBe(false)
    expect(getToolsByCategory('crypto').some(tool => tool.id === 'generator')).toBe(true)
    expect(getPrimaryTools().every(tool => !tool.variantOf)).toBe(true)
    expect(getPrimaryTools().length).toBeLessThan(tools.length)
  })

  it('finds a variant by search', () => {
    expect(searchTools('uuid').some(tool => tool.id === 'uuid')).toBe(true)
    expect(getToolById('base64')?.route).toBe('/hub/dev/base64')
  })

  it('provides category labels', () => {
    expect(categoryLabels.data).toBe('Data Lab')
  })

  it('lists tools for image category', () => {
    expect(categoryLabels.image).toBe('Image Lab')
    expect(getToolsByCategory('image').length).toBeGreaterThan(0)
    expect(getToolsByCategory('image').every(tool => tool.category === 'image')).toBe(true)
  })

  it('puts every tool in the category of its route', () => {
    for (const tool of tools) {
      // A converter sits one level deeper, so match the ends and not the whole.
      expect(tool.route.startsWith(`/hub/${tool.category}/`)).toBe(true)
      expect(tool.route.endsWith(`/${tool.slug}`)).toBe(true)
    }
  })

  it('never marks a tool as both client only and server required', () => {
    expect(tools.every(tool => !(tool.clientOnly && tool.serverRequired))).toBe(true)
  })

  it('gives every tool a name, a description, and a keyword', () => {
    for (const tool of tools) {
      expect(tool.name.length).toBeGreaterThan(0)
      expect(tool.description.length).toBeGreaterThan(0)
      expect(tool.keywords.length).toBeGreaterThan(0)
    }
  })

  it('lists tools for dev category', () => {
    expect(categoryLabels.dev).toBe('Dev Lab')
    expect(getToolsByCategory('dev').some(t => t.id === 'semver')).toBe(true)
    expect(getToolsByCategory('dev').some(t => t.id === 'cron')).toBe(true)
  })

  it('finds markdown-studio in data category', () => {
    const tool = getToolById('markdown-studio')
    expect(tool?.route).toBe('/hub/data/markdown-studio')
    expect(tool?.category).toBe('data')
    expect(tool?.clientOnly).toBe(true)
    expect(tool?.status).toBe('available')
  })

  it('finds sql-formatter in data category', () => {
    const tool = getToolById('sql-formatter')
    expect(tool?.route).toBe('/hub/data/sql-formatter')
    expect(tool?.category).toBe('data')
    expect(tool?.clientOnly).toBe(true)
    expect(tool?.status).toBe('available')
  })
})
