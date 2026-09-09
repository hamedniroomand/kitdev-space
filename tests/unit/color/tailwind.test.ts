import { describe, expect, it } from 'vitest'
import {
  formatAsCssVars,
  formatAsTailwindV3,
  formatAsTailwindV4,
  generateTailwindPalette,
} from '#shared/utils/color/tailwind'

/** The official Tailwind blue scale, for an accuracy check of the generator. */
const TAILWIND_BLUE = {
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
}

function toLab(hex: string): [number, number, number] {
  const channel = (value: number) => {
    const part = value / 255
    return part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
  }
  const r = channel(Number.parseInt(hex.slice(1, 3), 16))
  const g = channel(Number.parseInt(hex.slice(3, 5), 16))
  const b = channel(Number.parseInt(hex.slice(5, 7), 16))
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
  const f = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

/** CIE76 color difference. A value below 2 is hard to see. */
function deltaE(a: string, b: string): number {
  const first = toLab(a)
  const second = toLab(b)
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
}

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

  it('matches the official Tailwind blue values for the darker steps', () => {
    const shades = generateTailwindPalette(TAILWIND_BLUE[500])
    expect(deltaE(shades.find(s => s.shade === '600')!.hex, TAILWIND_BLUE[600])).toBeLessThan(2)
    expect(deltaE(shades.find(s => s.shade === '700')!.hex, TAILWIND_BLUE[700])).toBeLessThan(2)
  })

  it('anchors the input color to any shade step', () => {
    const shades = generateTailwindPalette('#1e40af', '800')
    expect(shades.find(s => s.shade === '800')?.hex).toBe('#1e40af')
    // The whole scale moves with the anchor, so 500 now holds a lighter step.
    expect(shades.find(s => s.shade === '500')?.hex).toBe(TAILWIND_BLUE[500])
    expect(shades.map(s => s.hex)).not.toEqual(
      generateTailwindPalette('#1e40af').map(s => s.hex),
    )
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

  it('keeps saturation zero for pure gray inputs', () => {
    const shades = generateTailwindPalette('#808080')
    for (const shade of shades) {
      // In pure gray, hex is #rrggbb where rr === gg === bb
      const hex = shade.hex.replace('#', '')
      const r = hex.slice(0, 2)
      const g = hex.slice(2, 4)
      const b = hex.slice(4, 6)
      expect(r).toBe(g)
      expect(g).toBe(b)
    }
  })

  it('redistributes darker shades when anchor lightness is near zero', () => {
    const shades = generateTailwindPalette('#101010')
    const darkShades = ['600', '700', '800', '900', '950'].map(
      key => shades.find(s => s.shade === key)?.hex,
    )
    // Darker shades should not all be identical
    const unique = new Set(darkShades)
    expect(unique.size).toBeGreaterThan(1)
  })

  it('normalizes an input that is not a lowercase hex value', () => {
    expect(generateTailwindPalette('rgb(59, 130, 246)').find(s => s.shade === '500')?.hex)
      .toBe('#3b82f6')
  })
})
