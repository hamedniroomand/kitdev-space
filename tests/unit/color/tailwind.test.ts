import { describe, expect, it } from 'vitest'
import {
  formatAsCssVars,
  formatAsTailwindV3,
  formatAsTailwindV4,
  generateTailwindPalette,
} from '#shared/utils/color/tailwind'

describe('generateTailwindPalette', () => {
  it('generates 11 shades from hex color', () => {
    const shades = generateTailwindPalette('#3b82f6')
    expect(shades).toHaveLength(11)
    expect(shades.map(s => s.shade)).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ])
    // 500 should be the input color
    expect(shades.find(s => s.shade === '500')?.hex).toBe('#3b82f6')
  })

  it('formats as Tailwind v4 theme CSS', () => {
    const shades = generateTailwindPalette('#3b82f6')
    const v4 = formatAsTailwindV4(shades, 'brand')
    expect(v4).toContain('@theme {')
    expect(v4).toContain('--color-brand-50:')
    expect(v4).toContain('--color-brand-500: #3b82f6;')
  })

  it('formats as Tailwind v3 JS config', () => {
    const shades = generateTailwindPalette('#3b82f6')
    const v3 = formatAsTailwindV3(shades, 'brand')
    expect(v3).toContain('module.exports')
    expect(v3).toContain('\'brand\': {')
    expect(v3).toContain('\'500\': \'#3b82f6\'')
  })

  it('formats as standard CSS variables', () => {
    const shades = generateTailwindPalette('#3b82f6')
    const css = formatAsCssVars(shades, 'brand')
    expect(css).toContain(':root {')
    expect(css).toContain('--brand-500: #3b82f6;')
  })
})
