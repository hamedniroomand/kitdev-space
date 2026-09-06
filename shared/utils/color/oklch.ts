import type { Oklch, Rgb } from './types'

/**
 * OKLCH conversion. The steps are sRGB, linear sRGB, LMS, Oklab, then OKLCH.
 * @see https://bottosson.github.io/posts/oklab/
 */

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

export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const lightness = l / 100
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const bAxis = c * Math.sin(radians)

  const long = (lightness + 0.3963377774 * a + 0.2158037573 * bAxis) ** 3
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * bAxis) ** 3
  const short = (lightness - 0.0894841775 * a - 1.2914855480 * bAxis) ** 3

  return {
    r: toSrgb(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    g: toSrgb(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    b: toSrgb(-0.0041960863 * long - 0.7034186147 * medium + 1.7076147010 * short),
  }
}

/** True when the OKLCH color is outside the sRGB gamut. */
export function isOutOfSrgbGamut({ l, c, h }: Oklch): boolean {
  const lightness = l / 100
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const bAxis = c * Math.sin(radians)

  const long = (lightness + 0.3963377774 * a + 0.2158037573 * bAxis) ** 3
  const medium = (lightness - 0.1055613458 * a - 0.0638541728 * bAxis) ** 3
  const short = (lightness - 0.0894841775 * a - 1.2914855480 * bAxis) ** 3

  const channels = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.7076147010 * short,
  ]

  return channels.some(value => value < -0.0001 || value > 1.0001)
}

export function toOklchString({ l, c, h }: Oklch): string {
  return `oklch(${l}% ${c} ${h})`
}
