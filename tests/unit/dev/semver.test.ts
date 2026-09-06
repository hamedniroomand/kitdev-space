import { describe, expect, it } from 'vitest'
import { canSemverInBrowser, semverBump } from '#shared/utils/dev/semver'

describe('canSemverInBrowser', () => {
  it('accepts bump only', () => {
    expect(canSemverInBrowser('bump')).toBe(true)
    expect(canSemverInBrowser('satisfies')).toBe(false)
    expect(canSemverInBrowser('sort')).toBe(false)
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
