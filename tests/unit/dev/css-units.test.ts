import { describe, expect, it } from 'vitest'
import {
  convertAllCssUnits,
  convertCssUnit,
  fromPx,
  toPx
} from '../../../shared/utils/dev/css-units'

describe('css units converter', () => {
  it('converts rem to px and back with default 16px root font size', () => {
    expect(toPx(1, 'rem')).toBe(16)
    expect(toPx(2.5, 'rem')).toBe(40)
    expect(fromPx(16, 'rem')).toBe(1)
    expect(fromPx(32, 'rem')).toBe(2)
  })

  it('respects custom root font size', () => {
    expect(convertCssUnit(2, 'rem', 'px', { rootFontSize: 20 })).toBe(40)
    expect(convertCssUnit(40, 'px', 'rem', { rootFontSize: 20 })).toBe(2)
  })

  it('converts viewport units correctly', () => {
    expect(convertCssUnit(50, 'vw', 'px', { viewportWidth: 1920 })).toBe(960)
    expect(convertCssUnit(960, 'px', 'vw', { viewportWidth: 1920 })).toBe(50)

    expect(convertCssUnit(50, 'vh', 'px', { viewportHeight: 1080 })).toBe(540)
    expect(convertCssUnit(540, 'px', 'vh', { viewportHeight: 1080 })).toBe(50)
  })

  it('converts all units simultaneously', () => {
    const results = convertAllCssUnits(16, 'px', {
      rootFontSize: 16,
      viewportWidth: 1600,
      viewportHeight: 800
    })

    expect(results.px).toBe(16)
    expect(results.rem).toBe(1)
    expect(results.em).toBe(1)
    expect(results.vw).toBe(1)
    expect(results.vh).toBe(2)
  })
})
