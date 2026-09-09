import { describe, expect, it } from 'vitest'
import {
  convertAllCssUnits,
  convertCssUnit,
  convertPxSnippetToRem,
  fromPx,
  toPx,
} from '#shared/utils/dev/css-units'

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
      viewportHeight: 800,
    })

    expect(results.px).toBe(16)
    expect(results.rem).toBe(1)
    expect(results.em).toBe(1)
    expect(results.vw).toBe(1)
    expect(results.vh).toBe(2)
  })
})

describe('parent font size for em', () => {
  it('gives a different em and rem when the sizes differ', () => {
    const results = convertAllCssUnits(32, 'px', { rootFontSize: 16, parentFontSize: 20 })

    expect(results.rem).toBe(2)
    expect(results.em).toBe(1.6)
    expect(results.em).not.toBe(results.rem)
  })

  it('gives an equal em and rem when the sizes are equal', () => {
    const results = convertAllCssUnits(24, 'px', { rootFontSize: 12, parentFontSize: 12 })

    expect(results.rem).toBe(2)
    expect(results.em).toBe(2)
  })

  it('reads em from the parent font size in both directions', () => {
    expect(toPx(2, 'em', { rootFontSize: 16, parentFontSize: 10 })).toBe(20)
    expect(toPx(2, 'rem', { rootFontSize: 16, parentFontSize: 10 })).toBe(32)
    expect(convertCssUnit(1, 'em', 'rem', { rootFontSize: 16, parentFontSize: 32 })).toBe(2)
  })

  it('falls back to the root font size when no parent font size is given', () => {
    expect(toPx(2, 'em', { rootFontSize: 20 })).toBe(40)
    expect(fromPx(40, 'em', { rootFontSize: 20 })).toBe(2)
  })

  it('returns 0 for a parent font size of 0', () => {
    expect(fromPx(40, 'em', { rootFontSize: 16, parentFontSize: 0 })).toBe(0)
  })
})

describe('convertPxSnippetToRem', () => {
  it('converts every px length of a rule', () => {
    const css = '.card {\n  padding: 24px;\n  font-size: 32px;\n}'

    expect(convertPxSnippetToRem(css)).toBe('.card {\n  padding: 1.5rem;\n  font-size: 2rem;\n}')
  })

  it('converts two values on one line', () => {
    expect(convertPxSnippetToRem('background-position: 10px 20px;'))
      .toBe('background-position: 0.625rem 1.25rem;')
  })

  it('keeps 0px as 0', () => {
    expect(convertPxSnippetToRem('margin: 0px auto;')).toBe('margin: 0 auto;')
    expect(convertPxSnippetToRem('inset: 0.0px -0px;')).toBe('inset: 0 0;')
  })

  it('keeps a 1px hairline', () => {
    expect(convertPxSnippetToRem('border: 1px solid red;')).toBe('border: 1px solid red;')
    expect(convertPxSnippetToRem('margin-top: -1px;')).toBe('margin-top: -1px;')
  })

  it('converts a negative value, a fraction, and a leading dot', () => {
    expect(convertPxSnippetToRem('margin: -4px .5px 2.5px;')).toBe('margin: -0.25rem 0.0313rem 0.1563rem;')
  })

  it('converts a value inside calc()', () => {
    expect(convertPxSnippetToRem('width: calc(100% - 32px);')).toBe('width: calc(100% - 2rem);')
    expect(convertPxSnippetToRem('width: calc(100vw - (2px * 8));')).toBe('width: calc(100vw - (0.125rem * 8));')
  })

  it('keeps px inside a comment, a string, and a url', () => {
    const css = [
      '/* keep 24px here */',
      'content: "24px";',
      'content: \'24px\';',
      'background: url(sprite-24px.png) no-repeat;',
      'padding: 24px;',
    ].join('\n')

    expect(convertPxSnippetToRem(css)).toBe([
      '/* keep 24px here */',
      'content: "24px";',
      'content: \'24px\';',
      'background: url(sprite-24px.png) no-repeat;',
      'padding: 1.5rem;',
    ].join('\n'))
  })

  it('keeps px inside an unterminated comment', () => {
    expect(convertPxSnippetToRem('padding: 24px;\n/* 32px')).toBe('padding: 1.5rem;\n/* 32px')
  })

  it('keeps px inside an identifier and a custom property name', () => {
    expect(convertPxSnippetToRem('--gap-4px: 24px;')).toBe('--gap-4px: 1.5rem;')
    expect(convertPxSnippetToRem('width: 24pxx;')).toBe('width: 24pxx;')
  })

  it('respects a custom root font size and rounds the result', () => {
    expect(convertPxSnippetToRem('padding: 24px;', 24)).toBe('padding: 1rem;')
    expect(convertPxSnippetToRem('padding: 10px;', 17)).toBe('padding: 0.5882rem;')
  })

  it('returns the snippet when the root font size is not usable', () => {
    expect(convertPxSnippetToRem('padding: 24px;', 0)).toBe('padding: 24px;')
  })
})
