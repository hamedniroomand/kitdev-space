import type { Hsl, Rgb } from './types'

export { isOutOfSrgbGamut, oklchToRgb, rgbToOklch, toOklchString } from './oklch'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

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

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sat = s / 100
  const light = l / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const huePrime = (((h % 360) + 360) % 360) / 60
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1))
  let r = 0
  let g = 0
  let b = 0

  if (huePrime < 1) {
    r = chroma
    g = x
  }
  else if (huePrime < 2) {
    r = x
    g = chroma
  }
  else if (huePrime < 3) {
    g = chroma
    b = x
  }
  else if (huePrime < 4) {
    g = x
    b = chroma
  }
  else if (huePrime < 5) {
    r = x
    b = chroma
  }
  else {
    r = chroma
    b = x
  }

  const match = light - chroma / 2
  return {
    r: clampByte((r + match) * 255),
    g: clampByte((g + match) * 255),
    b: clampByte((b + match) * 255),
  }
}
