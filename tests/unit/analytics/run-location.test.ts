import { describe, expect, it } from 'vitest'
import { runLocationFor } from '#shared/utils/analytics/run-location'

describe('runLocationFor', () => {
  it('reads the registry flags', () => {
    expect(runLocationFor({ clientOnly: true, serverRequired: false })).toBe('browser')
    expect(runLocationFor({ clientOnly: false, serverRequired: true })).toBe('server')
    expect(runLocationFor({ clientOnly: false, serverRequired: false })).toBe('mixed')
  })
})
