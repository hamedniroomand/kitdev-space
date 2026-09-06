import { describe, expect, it } from 'vitest'
import { createPalette } from '#shared/utils/color/palette'

describe('createPalette', () => {
  it('returns the requested number of hex colors', () => {
    const palette = createPalette('#7c3aed', 5)
    expect(palette).toHaveLength(5)
    expect(palette.every(color => /^#[0-9a-f]{6}$/i.test(color))).toBe(true)
  })
})
