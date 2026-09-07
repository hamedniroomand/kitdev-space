import { describe, expect, it } from 'vitest'
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

describe('parseColor', () => {
  it('parses hex colors', () => {
    const color = parseColor('#ffffff')
    expect(color.hex).toBe('#ffffff')
    expect(toRgbString(color.rgb)).toBe('rgb(255, 255, 255)')
    expect(toHslString(color.hsl)).toContain('hsl(')
  })

  it('parses 4-digit and 8-digit hex colors', () => {
    const four = parseColor('#f00f')
    expect(four.hex).toBe('#ff0000')

    const eight = parseColor('#00ff0080')
    expect(eight.hex).toBe('#00ff00')
  })

  it('parses space-separated rgb with and without alpha', () => {
    const space = parseColor('rgb(255 128 0)')
    expect(space.rgb).toEqual({ r: 255, g: 128, b: 0 })

    const spaceAlpha = parseColor('rgb(255 128 0 / 0.5)')
    expect(spaceAlpha.rgb).toEqual({ r: 255, g: 128, b: 0 })
  })

  it('parses rebeccapurple named color', () => {
    const color = parseColor('rebeccapurple')
    expect(color.hex).toBe('#663399')
  })

  it('parses OKLCH with 0..1 and 0..100% lightness', () => {
    const ratio = parseColor('oklch(0.6 0.15 120)')
    const percent = parseColor('oklch(60% 0.15 120)')
    expect(ratio.hex).toBe(percent.hex)
    expect(ratio.oklch.l).toBeCloseTo(60, 0)
  })
})
