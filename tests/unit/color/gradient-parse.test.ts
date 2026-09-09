import { describe, expect, it } from 'vitest'
import { formatGradientCss } from '#shared/utils/color/gradient'
import { parseGradientCss } from '#shared/utils/color/gradient-parse'

describe('parseGradientCss', () => {
  it('reads an angle and percentage positions', () => {
    const result = parseGradientCss('linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)')

    expect(result.type).toBe('linear')
    expect(result.angle).toBe(135)
    expect(result.warnings).toEqual([])
    expect(result.stops.map(stop => [stop.color, stop.position])).toEqual([
      ['#7c3aed', 0],
      ['#06b6d4', 100],
    ])
  })

  it('round trips its own output', () => {
    const css = 'linear-gradient(90deg, #111111 0%, #eeeeee 100%)'
    expect(formatGradientCss(parseGradientCss(css))).toBe(css)
  })

  it('drops the background prefix and the semicolon', () => {
    const result = parseGradientCss('background: linear-gradient(45deg, red 0%, blue 100%);')
    expect(result.angle).toBe(45)
    expect(result.stops[0]!.color).toBe('#ff0000')
  })

  it('converts angle units', () => {
    expect(parseGradientCss('linear-gradient(0.5turn, red, blue)').angle).toBe(180)
    expect(parseGradientCss('linear-gradient(200grad, red, blue)').angle).toBe(180)
  })

  it('reads side and corner keywords', () => {
    expect(parseGradientCss('linear-gradient(to right, red, blue)').angle).toBe(90)
    expect(parseGradientCss('linear-gradient(to top left, red, blue)').angle).toBe(315)
  })

  it('defaults to 180 degrees when the direction is absent', () => {
    const result = parseGradientCss('linear-gradient(red, blue)')
    expect(result.angle).toBe(180)
    expect(result.stops.map(stop => stop.position)).toEqual([0, 100])
  })

  it('spreads stops that have no position', () => {
    const result = parseGradientCss('linear-gradient(red, lime, blue)')
    expect(result.stops.map(stop => stop.position)).toEqual([0, 50, 100])
  })

  it('reads hex, rgb, hsl, oklch, and named colors', () => {
    const result = parseGradientCss(
      'linear-gradient(90deg, #f00 0%, rgb(0, 255, 0) 25%, hsl(240, 100%, 50%) 50%, oklch(0.7 0.15 200) 75%, rebeccapurple 100%)',
    )

    expect(result.warnings).toEqual([])
    expect(result.stops.map(stop => stop.color)).toEqual([
      '#ff0000',
      '#00ff00',
      '#0000ff',
      expect.stringMatching(/^#[0-9a-f]{6}$/),
      '#663399',
    ])
  })

  it('keeps the alpha of a stop', () => {
    const result = parseGradientCss('linear-gradient(90deg, rgba(255, 0, 0, 0.5) 0%, #0000ff80 100%)')
    expect(result.stops[0]!.alpha).toBe(0.5)
    expect(result.stops[1]!.alpha).toBe(0.502)
  })

  it('reads a radial gradient', () => {
    const result = parseGradientCss('radial-gradient(circle, #000000 0%, #ffffff 100%)')
    expect(result.type).toBe('radial')
    expect(result.warnings).toEqual([])
  })

  it('reads the oklch interpolation', () => {
    expect(parseGradientCss('linear-gradient(90deg in oklch, red, blue)').interpolation).toBe('oklch')
    expect(parseGradientCss('linear-gradient(in oklch 90deg, red, blue)').interpolation).toBe('oklch')
    expect(parseGradientCss('linear-gradient(90deg, red, blue)').interpolation).toBe('srgb')
  })

  it('warns about an unsupported interpolation space', () => {
    const result = parseGradientCss('linear-gradient(in oklab, red, blue)')
    expect(result.interpolation).toBe('srgb')
    expect(result.warnings[0]).toContain('oklab')
  })

  it('warns about an unsupported token', () => {
    const result = parseGradientCss('linear-gradient(sideways, red 0%, blue 100%)')
    expect(result.warnings).toContain('Unsupported CSS token "sideways".')
    expect(result.stops.length).toBe(2)
  })

  it('warns about a stop position that is not a percentage', () => {
    const result = parseGradientCss('linear-gradient(90deg, red 0%, blue 40px)')
    expect(result.warnings[0]).toContain('40px')
    expect(result.stops[1]!.position).toBe(100)
  })

  it('warns about a radial shape that it cannot draw', () => {
    const result = parseGradientCss('radial-gradient(ellipse at top left, red, blue)')
    expect(result.warnings[0]).toContain('centered circle')
  })

  it('warns about a background stack and keeps the first layer', () => {
    const result = parseGradientCss(
      'linear-gradient(90deg, red 0%, blue 100%), linear-gradient(0deg, lime 0%, black 100%)',
    )
    expect(result.warnings[0]).toContain('more than one layer')
    expect(result.stops.map(stop => stop.color)).toEqual(['#ff0000', '#0000ff'])
  })

  it('warns about an unsupported color', () => {
    const result = parseGradientCss('linear-gradient(90deg, red 0%, notacolor 50%, blue 100%)')
    expect(result.warnings).toContain('Unsupported color "notacolor".')
    expect(result.stops.length).toBe(2)
  })

  it('rejects a conic gradient', () => {
    expect(() => parseGradientCss('conic-gradient(red, blue)')).toThrow(/Conic/)
  })

  it('rejects a repeating gradient', () => {
    expect(() => parseGradientCss('repeating-linear-gradient(90deg, red 0%, blue 20%)')).toThrow(/Repeating/)
  })

  it('rejects input that is not a gradient', () => {
    expect(() => parseGradientCss('#ff0000')).toThrow(/linear-gradient/)
  })

  it('rejects a gradient with one stop', () => {
    expect(() => parseGradientCss('linear-gradient(90deg, red 0%)')).toThrow(/two color stops/)
  })
})
