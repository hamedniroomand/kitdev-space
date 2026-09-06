import { describe, expect, it } from 'bun:test'
import { semverBump, semverSatisfies, semverSort } from '#server/utils/dev/semver'

describe('semver helpers', () => {
  it('checks satisfies', () => {
    expect(semverSatisfies('1.2.3', '^1.0.0')).toBe(true)
    expect(semverSatisfies('2.0.0', '^1.0.0')).toBe(false)
  })

  it('sorts versions', () => {
    expect(semverSort(['1.10.0', '1.2.0', '1.9.0'])).toEqual([
      '1.2.0',
      '1.9.0',
      '1.10.0'
    ])
  })

  it('bumps patch', () => {
    expect(semverBump('1.2.3', 'patch')).toBe('1.2.4')
  })
})
