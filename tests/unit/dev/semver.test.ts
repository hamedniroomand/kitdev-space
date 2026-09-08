import { describe, expect, it } from 'vitest'
import { canSemverInBrowser, semverBump, semverSatisfies, semverSort } from '#shared/utils/dev/semver'

describe('canSemverInBrowser', () => {
  it('accepts all actions', () => {
    expect(canSemverInBrowser('bump')).toBe(true)
    expect(canSemverInBrowser('satisfies')).toBe(true)
    expect(canSemverInBrowser('sort')).toBe(true)
  })
})

describe('semverSatisfies', () => {
  it('checks version against range', () => {
    expect(semverSatisfies('1.2.3', '^1.0.0')).toBe(true)
    expect(semverSatisfies('2.0.0', '^1.0.0')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(() => semverSatisfies('', '^1.0.0')).toThrow('Enter a version and a range.')
  })
})

describe('semverSort', () => {
  it('sorts versions in ascending order', () => {
    expect(semverSort(['2.0.0', '1.0.0', '1.1.0'])).toEqual(['1.0.0', '1.1.0', '2.0.0'])
  })

  it('rejects empty list', () => {
    expect(() => semverSort([])).toThrow('Enter at least one version.')
  })
})

describe('semverBump', () => {
  it('bumps the patch', () => {
    expect(semverBump('1.2.3', 'patch')).toBe('1.2.4')
  })

  it('bumps the minor and resets the patch', () => {
    expect(semverBump('1.2.3', 'minor')).toBe('1.3.0')
  })

  it('bumps the major and resets the minor and the patch', () => {
    expect(semverBump('1.2.3', 'major')).toBe('2.0.0')
  })

  it('accepts a leading v', () => {
    expect(semverBump('v1.2.3', 'patch')).toBe('1.2.4')
  })

  it('rejects an invalid version', () => {
    expect(() => semverBump('1.2', 'patch')).toThrow('Enter a valid semver version like 1.2.3.')
    expect(() => semverBump('a.b.c', 'patch')).toThrow('Enter a valid semver version like 1.2.3.')
  })
})
