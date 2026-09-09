import { describe, expect, it } from 'vitest'
import { createPalette } from '#shared/utils/color/palette'
import { generateTailwindPalette } from '#shared/utils/color/tailwind'

describe('createPalette', () => {
  it('returns the requested number of hex colors', () => {
    const palette = createPalette('#7c3aed', 5)
    expect(palette).toHaveLength(5)
    expect(palette.every(color => /^#[0-9a-f]{6}$/i.test(color))).toBe(true)
  })

  it('keeps the base color in the result for an odd and an even count', () => {
    expect(createPalette('#059669', 5)).toContain('#059669')
    expect(createPalette('#059669', 8)).toContain('#059669')
  })

  it('takes every color from the shade scale', () => {
    const scale = generateTailwindPalette('#7c3aed').map(shade => shade.hex)
    for (const color of createPalette('#7c3aed', 7)) {
      expect(scale).toContain(color)
    }
  })
})
