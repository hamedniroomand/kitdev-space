import { describe, expect, it } from 'vitest'
import { validateYaml } from '#shared/utils/data/yaml-validator'

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
      features: ['fast', 'simple'],
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

  it('gives source offsets for an error, so the gutter can mark it', () => {
    const res = validateYaml('foo: bar\n  bad: 1\n')
    expect(res.isValid).toBe(false)
    expect(res.errors[0]?.from).toBeTypeOf('number')
    expect(res.errors[0]?.to).toBeTypeOf('number')
  })
})

describe('validateYaml multi-document streams', () => {
  it('parses every document that --- separates', () => {
    const res = validateYaml('a: 1\n---\nb: 2\n---\nc: 3\n')
    expect(res.isValid).toBe(true)
    expect(res.documentCount).toBe(3)
    expect(res.documents).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
  })

  it('returns an array as parsed when the stream holds many documents', () => {
    const res = validateYaml('a: 1\n---\nb: 2\n')
    expect(res.parsed).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('keeps the single value as parsed when the stream holds one document', () => {
    const res = validateYaml('a: 1\n')
    expect(res.parsed).toEqual({ a: 1 })
    expect(res.documentCount).toBe(1)
  })

  it('names the document index of an error in a stream', () => {
    const res = validateYaml('a: 1\n---\nfoo: bar\n  bad: 1\n')
    expect(res.isValid).toBe(false)
    expect(res.errors[0]?.docIndex).toBe(1)
  })
})

describe('validateYaml duplicate keys', () => {
  it('reports a duplicate key as a warning, not an error', () => {
    const res = validateYaml('a: 1\na: 2\n')
    expect(res.isValid).toBe(true)
    expect(res.errors).toHaveLength(0)
    expect(res.warnings.length).toBeGreaterThan(0)
    expect(res.warnings[0]?.message).toContain('unique')
  })

  it('gives the line number of a duplicate key', () => {
    const res = validateYaml('a: 1\na: 2\n')
    expect(res.warnings[0]?.line).toBe(2)
  })

  it('still gives the parsed value when a key repeats', () => {
    const res = validateYaml('a: 1\na: 2\n')
    expect(res.parsed).toEqual({ a: 2 })
  })

  it('reports a duplicate key in each document of a stream', () => {
    const res = validateYaml('a: 1\na: 2\n---\nb: 1\nb: 2\n')
    expect(res.warnings).toHaveLength(2)
    expect(res.warnings.map(w => w.docIndex)).toEqual([0, 1])
  })
})

describe('validateYaml circular aliases', () => {
  it('gives a clear error for a circular anchor alias', () => {
    const res = validateYaml('a: &x\n  b: *x\n')
    expect(res.isValid).toBe(false)
    expect(res.errors[0]?.message).toContain('circular anchor alias')
    expect(res.formattedJson).toBe('')
  })

  it('does not throw on a circular anchor alias', () => {
    expect(() => validateYaml('a: &x\n  b: *x\n')).not.toThrow()
  })
})

describe('validateYaml version rules', () => {
  it('reads yes as a boolean under YAML 1.1', () => {
    const res = validateYaml('flag: yes\n', '1.1')
    expect(res.parsed).toEqual({ flag: true })
  })

  it('reads yes as a string under YAML 1.2', () => {
    const res = validateYaml('flag: yes\n', '1.2')
    expect(res.parsed).toEqual({ flag: 'yes' })
  })

  it('uses YAML 1.2 by default', () => {
    expect(validateYaml('flag: yes\n').parsed).toEqual({ flag: 'yes' })
  })
})
