import type { Oklch } from './types'
import { isOutOfSrgbGamut, oklchToRgb, rgbToOklch } from './oklch'
import { parseColor, rgbToHex } from './parse'

export interface TailwindShade {
  shade: string
  hex: string
  isDark: boolean
}

export type TailwindPalette = Record<string, string>

export const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

export type ShadeKey = typeof SHADE_KEYS[number]

export const DEFAULT_ANCHOR: ShadeKey = '500'

const DEFAULT_ANCHOR_INDEX = SHADE_KEYS.indexOf(DEFAULT_ANCHOR)

/**
 * The shape of the scale, as the OKLCH form of the Tailwind blue ramp.
 *
 * The hue column is part of the shape: a Tailwind ramp turns the hue a few
 * degrees between the light steps and the dark steps.
 */
const REFERENCE_RAMP: Oklch[] = [
  { l: 97.05, c: 0.0142, h: 254.60 },
  { l: 93.19, c: 0.0316, h: 255.59 },
  { l: 88.23, c: 0.0571, h: 254.13 },
  { l: 80.91, c: 0.0956, h: 251.81 },
  { l: 71.37, c: 0.1434, h: 254.62 },
  { l: 62.31, c: 0.1880, h: 259.81 },
  { l: 54.62, c: 0.2152, h: 262.88 },
  { l: 48.82, c: 0.2172, h: 264.38 },
  { l: 42.45, c: 0.1809, h: 265.64 },
  { l: 37.91, c: 0.1378, h: 265.52 },
  { l: 28.23, c: 0.0874, h: 267.94 },
]

/** Lower the chroma until the color is inside sRGB. It keeps the lightness and the hue. */
function fitToSrgb(color: Oklch): Oklch {
  if (!isOutOfSrgbGamut(color)) {
    return color
  }
  let low = 0
  let high = color.c
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2
    if (isOutOfSrgbGamut({ ...color, c: middle })) {
      high = middle
    }
    else {
      low = middle
    }
  }
  return { ...color, c: low }
}

/**
 * Generate a full 50 to 950 scale from one color.
 *
 * The color of the anchor step stays exact. The other steps follow the
 * reference ramp: the lightness moves to the same fraction of the distance to
 * white or to black, and the chroma keeps the same ratio to the anchor.
 */
export function generateTailwindPalette(
  colorInput: string,
  anchorShade: ShadeKey = DEFAULT_ANCHOR,
): TailwindShade[] {
  const parsed = parseColor(colorInput)
  const base = rgbToOklch(parsed.rgb)
  const requested = SHADE_KEYS.indexOf(anchorShade)
  const anchorIndex = requested < 0 ? DEFAULT_ANCHOR_INDEX : requested
  const anchor = REFERENCE_RAMP[anchorIndex]!

  return SHADE_KEYS.map((shade, index) => {
    if (index === anchorIndex) {
      return { shade, hex: parsed.hex.toLowerCase(), isDark: base.l < 60 }
    }

    const step = REFERENCE_RAMP[index]!
    const lightness = step.l >= anchor.l
      ? base.l + (100 - base.l) * ((step.l - anchor.l) / (100 - anchor.l))
      : base.l * (step.l / anchor.l)
    const color = fitToSrgb({
      l: lightness,
      c: anchor.c === 0 ? 0 : base.c * (step.c / anchor.c),
      h: (base.h + step.h - anchor.h + 360) % 360,
    })

    return { shade, hex: rgbToHex(oklchToRgb(color)), isDark: lightness < 60 }
  })
}

export function formatAsTailwindV4(shades: TailwindShade[], colorName = 'primary'): string {
  const lines = shades.map(s => `  --color-${colorName}-${s.shade}: ${s.hex};`)
  return `@theme {\n${lines.join('\n')}\n}`
}

export function formatAsTailwindV3(shades: TailwindShade[], colorName = 'primary'): string {
  const shadeLines = shades.map(s => `      '${s.shade}': '${s.hex}',`)
  return `module.exports = {
  theme: {
    extend: {
      colors: {
        '${colorName}': {
${shadeLines.join('\n')}
        }
      }
    }
  }
};`
}

export function formatAsCssVars(shades: TailwindShade[], colorName = 'primary'): string {
  const lines = shades.map(s => `  --${colorName}-${s.shade}: ${s.hex};`)
  return `:root {\n${lines.join('\n')}\n}`
}
