import { describe, expect, it } from 'vitest'
import { extractPaletteFromPixels } from '../../../shared/utils/color/palette-extractor'

describe('extractPaletteFromPixels', () => {
  it('extracts distinct dominant colors', () => {
    // 50 red pixels, 50 blue pixels
    const pixels = new Uint8ClampedArray(400)
    for (let i = 0; i < 200; i += 4) {
      pixels[i] = 255 // R
      pixels[i + 1] = 0 // G
      pixels[i + 2] = 0 // B
      pixels[i + 3] = 255 // A
    }
    for (let i = 200; i < 400; i += 4) {
      pixels[i] = 0 // R
      pixels[i + 1] = 0 // G
      pixels[i + 2] = 255 // B
      pixels[i + 3] = 255 // A
    }

    const palette = extractPaletteFromPixels(pixels, 4)
    expect(palette).toHaveLength(2)
    expect(palette[0]?.hex).toBe('#ff0000')
    expect(palette[1]?.hex).toBe('#0000ff')
  })

  it('ignores fully transparent pixels', () => {
    const pixels = new Uint8ClampedArray(16)
    // 4 transparent pixels
    for (let i = 0; i < 16; i += 4) {
      pixels[i + 3] = 0
    }
    const palette = extractPaletteFromPixels(pixels, 4)
    expect(palette).toHaveLength(0)
  })
})
