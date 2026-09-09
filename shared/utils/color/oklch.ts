import type { Oklch, Rgb } from './types'

/**
 * OKLCH conversion. The steps are sRGB, linear sRGB, LMS, Oklab, then OKLCH.
 * @see https://bottosson.github.io/posts/oklab/
 */

/** Rounds a number to a count of decimal places. */
export function roundTo(value: number, places: number): number {
  return Number(value.toFixed(places))
}

function toLinear(value: number): number {
  const channel = value / 255
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function toSrgb(value: number): number {
  const channel = value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, Math.round(channel * 255)))
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const red = toLinear(r)
  const green = toLinear(g)
  const blue = toLinear(b)

  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

  const lightness = 0.2104542553 * long + 0.7936177850 * medium - 0.0040720468 * short
  const a = 1.9779984951 * long - 2.4285922050 * medium + 0.4505937099 * short
  const bAxis = 0.0259040371 * long + 0.7827717662 * medium - 0.8086757660 * short

  const chroma = Math.sqrt(a * a + bAxis * bAxis)
  // A gray color has no hue. Report 0 instead of a value from rounding noise.
  const hue = chroma < 1e-6 ? 0 : ((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360

  return {
    l: Number((lightness * 100).toFixed(3)),
    c: Number(chroma.toFixed(4)),
    h: Number(hue.toFixed(2)),
  }
}

/** Linear sRGB channels, 0 to 1. A value outside that range is outside the gamut. */
function oklchToLinearSrgb({ l, c, h }: Oklch): [number, number, number] {
  const lightness = l / 100
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const bAxis = c * Math.sin(radians)

  const long = (lightness + 0.3963377774 * a + 0.2158037573 * bAxis) ** 3
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * bAxis) ** 3
  const short = (lightness - 0.0894841775 * a - 1.2914855480 * bAxis) ** 3

  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.7076147010 * short,
  ]
}

/** Linear sRGB to linear Display P3. @see https://www.w3.org/TR/css-color-4/#color-conversion-code */
function linearSrgbToLinearP3([r, g, b]: [number, number, number]): [number, number, number] {
  return [
    0.8224621 * r + 0.1775380 * g,
    0.0331941 * r + 0.9668058 * g,
    0.0170827 * r + 0.0723974 * g + 0.9105199 * b,
  ]
}

// Rounding noise puts an in-gamut channel a little outside 0 to 1.
const GAMUT_TOLERANCE = 0.0001

function isInUnitRange(channels: [number, number, number]): boolean {
  return channels.every(value => value >= -GAMUT_TOLERANCE && value <= 1 + GAMUT_TOLERANCE)
}

export function oklchToRgb(oklch: Oklch): Rgb {
  const [r, g, b] = oklchToLinearSrgb(oklch)
  return { r: toSrgb(r), g: toSrgb(g), b: toSrgb(b) }
}

/** True when the OKLCH color is outside the sRGB gamut. */
export function isOutOfSrgbGamut(oklch: Oklch): boolean {
  return !isInUnitRange(oklchToLinearSrgb(oklch))
}

/** True when the OKLCH color is outside the Display P3 gamut, which is wider than sRGB. */
export function isOutOfP3Gamut(oklch: Oklch): boolean {
  return !isInUnitRange(linearSrgbToLinearP3(oklchToLinearSrgb(oklch)))
}

/** `precision` sets the decimal places of each channel. It keeps the full value when it is absent. */
export function toOklchString({ l, c, h, a }: Oklch, precision?: number): string {
  const at = (value: number) => (precision === undefined ? value : roundTo(value, precision))
  const channels = `${at(l)}% ${at(c)} ${at(h)}`
  if (a !== undefined && a < 1) {
    return `oklch(${channels} / ${a})`
  }
  return `oklch(${channels})`
}
