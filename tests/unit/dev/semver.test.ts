import { describe, expect, it } from 'vitest'
import {
  canSemverInBrowser,
  explainSemverRange,
  semverBump,
  semverMatchList,
  semverMatrix,
  semverSatisfies,
  semverSort,
} from '#shared/utils/dev/semver'

describe('canSemverInBrowser', () => {
  it('accepts all actions', () => {
    expect(canSemverInBrowser('bump')).toBe(true)
    expect(canSemverInBrowser('satisfies')).toBe(true)
    expect(canSemverInBrowser('sort')).toBe(true)
    expect(canSemverInBrowser('matrix')).toBe(true)
  })
})

describe('explainSemverRange', () => {
  it('expands a caret range', () => {
    expect(explainSemverRange('^1.2.3')).toBe('>=1.2.3 <2.0.0')
  })

  it('expands a tilde range', () => {
    expect(explainSemverRange('~1.2.3')).toBe('>=1.2.3 <1.3.0')
  })

  it('expands a hyphen range', () => {
    expect(explainSemverRange('1.2.3 - 2.3.4')).toBe('>=1.2.3 <=2.3.4')
  })

  it('expands an x range', () => {
    expect(explainSemverRange('1.x')).toBe('>=1.0.0 <2.0.0')
  })

  it('joins alternative ranges', () => {
    expect(explainSemverRange('^1.0.0 || ^3.0.0')).toBe('>=1.0.0 <2.0.0 || >=3.0.0 <4.0.0')
  })

  it('names the range that accepts any version', () => {
    expect(explainSemverRange('*')).toBe('any version')
  })

  it('rejects an invalid range', () => {
    expect(() => explainSemverRange('latest')).toThrow('Enter a valid semver range like ^1.2.3.')
  })
})

describe('semverSatisfies', () => {
  it('checks version against range', () => {
    expect(semverSatisfies('1.2.3', '^1.0.0')).toBe(true)
    expect(semverSatisfies('2.0.0', '^1.0.0')).toBe(false)
  })

  it('excludes a prerelease by default', () => {
    expect(semverSatisfies('1.2.3-beta.1', '^1.0.0')).toBe(false)
  })

  it('includes a prerelease with the option', () => {
    expect(semverSatisfies('1.2.3-beta.1', '^1.0.0', { includePrerelease: true })).toBe(true)
  })

  it('rejects empty input', () => {
    expect(() => semverSatisfies('', '^1.0.0')).toThrow('Enter a version and a range.')
    expect(() => semverSatisfies('1.2.3', '')).toThrow('Enter a version and a range.')
  })

  it('rejects an invalid range', () => {
    expect(() => semverSatisfies('1.2.3', 'latest')).toThrow('Enter a valid semver range like ^1.2.3.')
  })
})

describe('semverMatchList', () => {
  it('marks each candidate as pass or fail', () => {
    expect(semverMatchList(['1.2.0', '2.0.0'], '^1.0.0')).toEqual([
      { version: '1.2.0', valid: true, matches: true },
      { version: '2.0.0', valid: true, matches: false },
    ])
  })

  it('marks an invalid candidate', () => {
    expect(semverMatchList(['1.2'], '^1.0.0')).toEqual([
      { version: '1.2', valid: false, matches: false },
    ])
  })

  it('includes a prerelease candidate with the option', () => {
    expect(semverMatchList(['1.5.0-rc.1'], '^1.0.0', { includePrerelease: true })[0]?.matches).toBe(true)
  })

  it('rejects an empty list', () => {
    expect(() => semverMatchList([], '^1.0.0')).toThrow('Enter at least one version.')
  })
})

describe('semverMatrix', () => {
  it('tests every version against every range', () => {
    expect(semverMatrix(['1.2.0', '2.0.0'], ['^1.0.0', '>=2.0.0'])).toEqual({
      ranges: ['^1.0.0', '>=2.0.0'],
      rows: [
        { version: '1.2.0', valid: true, cells: [true, false] },
        { version: '2.0.0', valid: true, cells: [false, true] },
      ],
    })
  })

  it('rejects an empty range list', () => {
    expect(() => semverMatrix(['1.2.0'], [])).toThrow('Enter at least one range.')
  })

  it('rejects an invalid range', () => {
    expect(() => semverMatrix(['1.2.0'], ['^1.0.0', 'latest'])).toThrow('Enter a valid semver range like ^1.2.3.')
  })
})

describe('semverSort', () => {
  it('sorts versions in ascending order', () => {
    expect(semverSort(['2.0.0', '1.0.0', '1.1.0'])).toEqual(['1.0.0', '1.1.0', '2.0.0'])
  })

  it('sorts a prerelease before its release', () => {
    expect(semverSort(['1.2.3', '1.2.3-beta.1', '1.2.3-alpha'])).toEqual([
      '1.2.3-alpha',
      '1.2.3-beta.1',
      '1.2.3',
    ])
  })

  it('rejects empty list', () => {
    expect(() => semverSort([])).toThrow('Enter at least one version.')
  })

  it('rejects an invalid version', () => {
    expect(() => semverSort(['1.0.0', 'abc'])).toThrow('Enter a valid semver version like 1.2.3.')
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

  it('bumps a prerelease number', () => {
    expect(semverBump('1.2.3-beta.1', 'prerelease')).toBe('1.2.3-beta.2')
    expect(semverBump('1.2.3-beta.1', 'prerelease', 'beta')).toBe('1.2.3-beta.2')
  })

  it('starts a prerelease with a new identifier', () => {
    expect(semverBump('1.2.3', 'prerelease', 'beta')).toBe('1.2.4-beta.0')
    expect(semverBump('1.2.3-beta.1', 'prerelease', 'alpha')).toBe('1.2.3-alpha.0')
  })

  it('keeps the prerelease tag out of a patch bump result', () => {
    expect(semverBump('1.2.3-beta.1', 'patch')).toBe('1.2.3')
  })

  it('accepts a leading v', () => {
    expect(semverBump('v1.2.3', 'patch')).toBe('1.2.4')
  })

  it('rejects an invalid version', () => {
    expect(() => semverBump('1.2', 'patch')).toThrow('Enter a valid semver version like 1.2.3.')
    expect(() => semverBump('a.b.c', 'patch')).toThrow('Enter a valid semver version like 1.2.3.')
  })
})
