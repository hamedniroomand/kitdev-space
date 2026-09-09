import { describe, expect, it } from 'vitest'
import { contrastRatio } from '#shared/utils/color/contrast'
import {
  averageStopColor,
  checkGradientTextContrast,
  createGradientStop,
  formatGradientCss,
  formatGradientDeclaration,
  sortStops,
} from '#shared/utils/color/gradient'
import { parseColor } from '#shared/utils/color/parse'

describe('formatGradientCss', () => {
  it('builds a linear gradient with sorted stops', () => {
    const css = formatGradientCss({
      type: 'linear',
      angle: 135,
      stops: [
        createGradientStop('#06b6d4', 100, 'b'),
        createGradientStop('#7c3aed', 0, 'a'),
      ],
    })
    expect(css).toBe('linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)')
  })

  it('builds a radial gradient', () => {
    const css = formatGradientCss({
      type: 'radial',
      angle: 0,
      stops: [
        createGradientStop('#000', 0, 'a'),
        createGradientStop('#fff', 100, 'b'),
      ],
    })
    expect(css).toBe('radial-gradient(circle, #000000 0%, #ffffff 100%)')
  })

  it('adds the alpha byte for a stop that is not opaque', () => {
    const css = formatGradientCss({
      type: 'linear',
      angle: 90,
      stops: [
        { ...createGradientStop('#7c3aed', 0, 'a'), alpha: 0.5 },
        createGradientStop('#06b6d4', 100, 'b'),
      ],
    })
    expect(css).toBe('linear-gradient(90deg, #7c3aed80 0%, #06b6d4 100%)')
  })

  it('formats a CSS declaration', () => {
    expect(formatGradientDeclaration({
      type: 'linear',
      angle: 90,
      stops: [
        createGradientStop('#111111', 0, 'a'),
        createGradientStop('#eeeeee', 100, 'b'),
      ],
    })).toBe('background: linear-gradient(90deg, #111111 0%, #eeeeee 100%);')
  })
})

describe('checkGradientTextContrast', () => {
  it('reports the worst contrast across stops', () => {
    const result = checkGradientTextContrast('#ffffff', [
      createGradientStop('#000000', 0, 'a'),
      createGradientStop('#777777', 100, 'b'),
    ])

    expect(result.samples.length).toBe(3)
    expect(result.worstRatio).toBeLessThan(contrastAgainstWhite())
    expect(result.levels.aa).toBe(false)
  })

  it('samples at the stop coordinates and at the average', () => {
    const stops = [
      createGradientStop('#00f', 100, 'c'),
      createGradientStop('#f00', 0, 'a'),
      createGradientStop('#0f0', 40, 'b'),
    ]
    const sorted = sortStops(stops)
    const result = checkGradientTextContrast('#ffffff', stops)

    expect(result.samples.length).toBe(stops.length + 1)
    expect(result.samples.map(sample => sample.label)).toEqual([
      'Stop 1',
      'Stop 2',
      'Stop 3',
      'Average',
    ])

    for (const [index, stop] of sorted.entries()) {
      expect(result.samples[index]!.color).toBe(parseColor(stop.color).hex)
      expect(result.samples[index]!.ratio).toBe(contrastRatio('#ffffff', stop.color))
    }

    const average = result.samples.at(-1)!
    expect(average.color).toBe(averageStopColor(stops))
    expect(average.ratio).toBe(contrastRatio('#ffffff', average.color))
  })

  it('averages stop colors', () => {
    expect(averageStopColor([
      createGradientStop('#000000', 0, 'a'),
      createGradientStop('#ffffff', 100, 'b'),
    ])).toBe('#808080')
  })
})

function contrastAgainstWhite() {
  return checkGradientTextContrast('#ffffff', [
    createGradientStop('#000000', 0, 'a'),
    createGradientStop('#000000', 100, 'b'),
  ]).worstRatio
}
