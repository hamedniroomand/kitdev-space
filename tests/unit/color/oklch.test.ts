import { describe, expect, it } from 'vitest'
import { isOutOfSrgbGamut, oklchToRgb, rgbToOklch, toOklchString } from '#shared/utils/color/oklch'
import { parseColor } from '#shared/utils/color/parse'

describe('rgbToOklch', () => {
  it('converts white and black', () => {
    expect(rgbToOklch({ r: 255, g: 255, b: 255 }).l).toBeCloseTo(100, 1)
    expect(rgbToOklch({ r: 255, g: 255, b: 255 }).c).toBeCloseTo(0, 3)
    expect(rgbToOklch({ r: 0, g: 0, b: 0 }).l).toBeCloseTo(0, 3)
  })

  it('reports no hue for a gray color', () => {
    const gray = rgbToOklch({ r: 128, g: 128, b: 128 })
    expect(gray.c).toBeCloseTo(0, 3)
    expect(gray.h).toBe(0)
  })

  it('matches the reference value of pure red', () => {
    const red = rgbToOklch({ r: 255, g: 0, b: 0 })
    expect(red.l).toBeCloseTo(62.796, 1)
    expect(red.c).toBeCloseTo(0.2577, 3)
    expect(red.h).toBeCloseTo(29.23, 1)
  })
})

describe('oklchToRgb', () => {
  it('returns the input color after a round trip', () => {
    for (const rgb of [
      { r: 124, g: 58, b: 237 },
      { r: 16, g: 185, b: 129 },
      { r: 250, g: 204, b: 21 },
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ]) {
      expect(oklchToRgb(rgbToOklch(rgb))).toEqual(rgb)
    }
  })
})

describe('isOutOfSrgbGamut', () => {
  it('accepts a color inside the gamut', () => {
    expect(isOutOfSrgbGamut(rgbToOklch({ r: 124, g: 58, b: 237 }))).toBe(false)
  })

  it('reports a chroma that sRGB cannot show', () => {
    expect(isOutOfSrgbGamut({ l: 70, c: 0.4, h: 150 })).toBe(true)
  })
})

describe('toOklchString', () => {
  it('writes the CSS form', () => {
    expect(toOklchString({ l: 62.8, c: 0.258, h: 29.23 })).toBe('oklch(62.8% 0.258 29.23)')
  })
})

describe('parseColor with OKLCH', () => {
  it('gives an OKLCH value for every input form', () => {
    expect(parseColor('#ff0000').oklch.h).toBeCloseTo(29.23, 1)
    expect(parseColor('rgb(255, 0, 0)').oklch.c).toBeCloseTo(0.2577, 3)
    expect(parseColor('hsl(0, 100%, 50%)').oklch.l).toBeCloseTo(62.796, 1)
  })

  it('reads an OKLCH input', () => {
    expect(parseColor('oklch(62.796% 0.2577 29.23)').hex).toBe('#ff0000')
    expect(parseColor('oklch(100% 0 0)').hex).toBe('#ffffff')
  })

  it('reports a bad color', () => {
    expect(() => parseColor('not-a-color')).toThrow(/HEX, RGB, HSL, or OKLCH/)
  })
})
