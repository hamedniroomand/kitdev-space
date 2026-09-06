import { describe, expect, it } from 'vitest'
import { validateYaml } from '../../../shared/utils/data/yaml-validator'

describe('validateYaml', () => {
  it('validates valid yaml correctly', () => {
    const yaml = `
name: KitDev
version: 1.0.0
features:
  - fast
  - simple
`
    const res = validateYaml(yaml)
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.parsed).toEqual({
      name: 'KitDev',
      version: '1.0.0',
      features: ['fast', 'simple']
    })
    expect(res.formattedJson).toContain('"name": "KitDev"')
  })

  it('detects syntax errors with line numbers', () => {
    const invalidYaml = `
foo: bar
  bad_indent: 123
`
    const res = validateYaml(invalidYaml)
    expect(res.isValid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
    expect(res.errors[0]?.line).toBeDefined()
  })

  it('handles empty input gracefully', () => {
    const res = validateYaml('   ')
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.parsed).toBeNull()
  })
})
