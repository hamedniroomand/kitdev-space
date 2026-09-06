import { describe, expect, it } from 'vitest'
import {
  averageStopColor,
  checkGradientTextContrast,
  createGradientStop,
  formatGradientCss,
  formatGradientDeclaration
} from '../../../shared/utils/color/gradient'

describe('formatGradientCss', () => {
  it('builds a linear gradient with sorted stops', () => {
    const css = formatGradientCss({
      type: 'linear',
      angle: 135,
      stops: [
        createGradientStop('#06b6d4', 100, 'b'),
        createGradientStop('#7c3aed', 0, 'a')
      ]
    })
    expect(css).toBe('linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)')
  })

  it('builds a radial gradient', () => {
    const css = formatGradientCss({
      type: 'radial',
      angle: 0,
      stops: [
        createGradientStop('#000', 0, 'a'),
        createGradientStop('#fff', 100, 'b')
      ]
    })
    expect(css).toBe('radial-gradient(circle, #000000 0%, #ffffff 100%)')
  })

  it('formats a CSS declaration', () => {
    expect(formatGradientDeclaration({
      type: 'linear',
      angle: 90,
      stops: [
        createGradientStop('#111111', 0, 'a'),
        createGradientStop('#eeeeee', 100, 'b')
      ]
    })).toBe('background: linear-gradient(90deg, #111111 0%, #eeeeee 100%);')
  })
})

describe('checkGradientTextContrast', () => {
  it('reports the worst contrast across stops', () => {
    const result = checkGradientTextContrast('#ffffff', [
      createGradientStop('#000000', 0, 'a'),
      createGradientStop('#777777', 100, 'b')
    ])

    expect(result.samples.length).toBe(3)
    expect(result.worstRatio).toBeLessThan(contrastAgainstWhite())
    expect(result.levels.aa).toBe(false)
  })

  it('averages stop colors', () => {
    expect(averageStopColor([
      createGradientStop('#000000', 0, 'a'),
      createGradientStop('#ffffff', 100, 'b')
    ])).toBe('#808080')
  })
})

function contrastAgainstWhite() {
  return checkGradientTextContrast('#ffffff', [
    createGradientStop('#000000', 0, 'a'),
    createGradientStop('#000000', 100, 'b')
  ]).worstRatio
}
