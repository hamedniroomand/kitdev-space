import { describe, expect, it } from 'vitest'
import {
  categoryLabels,
  getAvailableTools,
  getToolById,
  getToolsByCategory,
  searchTools,
  tools
} from '../../shared/utils/tools'

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

  it('provides category labels', () => {
    expect(categoryLabels.data).toBe('Data Lab')
  })

  it('lists tools for image category', () => {
    expect(categoryLabels.image).toBe('Image Lab')
    expect(getToolsByCategory('image').length).toBe(4)
  })

  it('lists tools for dev category', () => {
    expect(categoryLabels.dev).toBe('Dev Lab')
    expect(getToolsByCategory('dev').some(t => t.id === 'semver')).toBe(true)
    expect(getToolsByCategory('dev').some(t => t.id === 'cron')).toBe(true)
  })
})
