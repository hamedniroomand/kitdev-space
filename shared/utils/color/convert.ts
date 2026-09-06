import type { Hsl, Rgb } from './types'

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const light = (max + min) / 2

  if (delta === 0) {
    return { h: 0, s: 0, l: light * 100 }
  }

  const sat = delta / (1 - Math.abs(2 * light - 1))
  const huePrime = max === red
    ? ((green - blue) / delta) % 6
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4
  let hue = huePrime * 60
  if (hue < 0) {
    hue += 360
  }

  return {
    h: hue,
    s: sat * 100,
    l: light * 100,
  }
}
