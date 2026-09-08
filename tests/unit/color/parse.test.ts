import { describe, expect, it } from 'vitest'
import { toOklchString } from '#shared/utils/color/oklch'
import { parseColor, toHslString, toRgbString } from '#shared/utils/color/parse'

describe('parseColor', () => {
  it('parses standard 6-digit hex colors', () => {
    const color = parseColor('#ffffff')
    expect(color.hex).toBe('#ffffff')
    expect(color.rgb).toEqual({ r: 255, g: 255, b: 255 })
    expect(toRgbString(color.rgb)).toBe('rgb(255, 255, 255)')
    expect(toHslString(color.hsl)).toContain('hsl(')
  })

  it('parses 3-digit hex colors', () => {
    const color = parseColor('#0f0')
    expect(color.hex).toBe('#00ff00')
    expect(color.rgb).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('parses 4-digit and 8-digit hex colors with alpha', () => {
    const four = parseColor('#f00f')
    expect(four.hex).toBe('#ff0000')
    expect(four.alpha).toBeUndefined()

    const fourHalf = parseColor('#f008')
    expect(fourHalf.hex).toBe('#ff0000')
    expect(fourHalf.alpha).toBeCloseTo(0.533, 2)
    expect(fourHalf.rgb.a).toBeCloseTo(0.533, 2)

    const eight = parseColor('#00ff0080')
    expect(eight.hex).toBe('#00ff00')
    expect(eight.alpha).toBeCloseTo(0.502, 2)
    expect(eight.rgb.a).toBeCloseTo(0.502, 2)
  })

  it('parses space-separated rgb with and without alpha', () => {
    const space = parseColor('rgb(255 128 0)')
    expect(space.rgb).toEqual({ r: 255, g: 128, b: 0 })

    const spaceAlpha = parseColor('rgb(255 128 0 / 0.5)')
    expect(spaceAlpha.rgb).toEqual({ r: 255, g: 128, b: 0, a: 0.5 })
    expect(spaceAlpha.alpha).toBe(0.5)
    expect(toRgbString(spaceAlpha.rgb)).toBe('rgb(255 128 0 / 0.5)')
  })

  it('parses space-separated rgb with percentage alpha', () => {
    const color = parseColor('rgb(255 0 0 / 50%)')
    expect(color.alpha).toBe(0.5)
    expect(color.rgb.a).toBe(0.5)
  })

  it('parses comma-separated rgb and rgba', () => {
    const comma = parseColor('rgb(10, 20, 30)')
    expect(comma.rgb).toEqual({ r: 10, g: 20, b: 30 })

    const rgba = parseColor('rgba(10, 20, 30, 0.4)')
    expect(rgba.rgb).toEqual({ r: 10, g: 20, b: 30, a: 0.4 })
    expect(rgba.alpha).toBe(0.4)
  })

  it('parses rgb percentage channels', () => {
    const color = parseColor('rgb(100% 50% 0%)')
    expect(color.rgb.r).toBe(255)
    expect(color.rgb.g).toBe(128)
    expect(color.rgb.b).toBe(0)
  })

  it('parses rgb with none keyword', () => {
    const color = parseColor('rgb(none 128 255)')
    expect(color.rgb).toEqual({ r: 0, g: 128, b: 255 })
  })

  it('parses rebeccapurple named color', () => {
    const color = parseColor('rebeccapurple')
    expect(color.hex).toBe('#663399')
  })

  it('parses transparent named color with alpha 0', () => {
    const color = parseColor('transparent')
    expect(color.rgb.r).toBe(0)
    expect(color.rgb.g).toBe(0)
    expect(color.rgb.b).toBe(0)
    expect(color.alpha).toBe(0)
  })

  it('parses standard comma-separated hsl', () => {
    const color = parseColor('hsl(120, 100%, 50%)')
    expect(color.hex).toBe('#00ff00')
    expect(color.hsl.h).toBe(120)
    expect(color.hsl.s).toBe(100)
    expect(color.hsl.l).toBe(50)
  })

  it('parses space-separated hsl with deg units', () => {
    const color = parseColor('hsl(180deg 100% 50%)')
    expect(color.hex).toBe('#00ffff')
    expect(color.hsl.h).toBe(180)
  })

  it('parses hsl with negative hue values', () => {
    const color = parseColor('hsl(-60deg 100% 50%)')
    expect(color.hsl.h).toBe(300)
    expect(color.hex).toBe('#ff00ff')
  })

  it('parses hsl with turn and grad angles', () => {
    const turn = parseColor('hsl(0.5turn 100% 50%)')
    expect(turn.hsl.h).toBe(180)

    const grad = parseColor('hsl(200grad 100% 50%)')
    expect(grad.hsl.h).toBe(180)
  })

  it('parses hsl with / alpha and formats correctly', () => {
    const color = parseColor('hsl(120deg 100% 50% / 0.8)')
    expect(color.alpha).toBe(0.8)
    expect(color.hsl.a).toBe(0.8)
    expect(toHslString(color.hsl)).toBe('hsl(120 100% 50% / 0.8)')
  })

  it('parses hsl with percentage alpha', () => {
    const color = parseColor('hsl(120 100% 50% / 80%)')
    expect(color.alpha).toBe(0.8)
  })

  it('parses hsl with none keyword', () => {
    const color = parseColor('hsl(none 100% 50%)')
    expect(color.hsl.h).toBe(0)
    expect(color.hex).toBe('#ff0000')
  })

  it('parses OKLCH with 0..1 and 0..100% lightness', () => {
    const ratio = parseColor('oklch(0.6 0.15 120)')
    const percent = parseColor('oklch(60% 0.15 120)')
    expect(ratio.hex).toBe(percent.hex)
    expect(ratio.oklch.l).toBeCloseTo(60, 0)
  })

  it('parses OKLCH with / alpha and formats correctly', () => {
    const color = parseColor('oklch(60% 0.15 120 / 0.5)')
    expect(color.alpha).toBe(0.5)
    expect(color.oklch.a).toBe(0.5)
    expect(toOklchString(color.oklch)).toContain('/ 0.5')
  })

  it('parses OKLCH with none keywords', () => {
    const color = parseColor('oklch(none none none / none)')
    expect(color.oklch.l).toBe(0)
    expect(color.oklch.c).toBe(0)
    expect(color.oklch.h).toBe(0)
    expect(color.alpha).toBeUndefined()
  })

  it('parses all common tool placeholder color strings', () => {
    const p1 = parseColor('#7c3aed')
    expect(p1.hex).toBe('#7c3aed')

    const p2 = parseColor('rgb(124 58 237)')
    expect(p2.rgb).toEqual({ r: 124, g: 58, b: 237 })

    const p3 = parseColor('oklch(53% 0.24 293)')
    expect(p3.oklch.l).toBeCloseTo(53, 0)
    expect(p3.oklch.c).toBe(0.24)
    expect(p3.oklch.h).toBe(293)
  })

  it('throws a descriptive error on invalid color strings', () => {
    expect(() => parseColor('not-a-color')).toThrow('Invalid color')
    expect(() => parseColor('rgb(1, 2)')).toThrow()
    expect(() => parseColor('hsl(foo bar baz)')).toThrow()
  })
})
