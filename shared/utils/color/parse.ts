import type { Hsl, ParsedColor, Rgb } from './types'
import { rgbToHsl } from './convert'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map(value => clampByte(value).toString(16).padStart(2, '0')).join('')}`
}

export function parseColor(input: string): ParsedColor {
  const text = input.trim()

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)
  if (hexMatch) {
    const raw = hexMatch[1]!
    const full = raw.length === 3
      ? raw.split('').map(char => char + char).join('')
      : raw
    const rgb = {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16)
    }
    return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) }
  }

  const rgbMatch = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i.exec(text)
  if (rgbMatch) {
    const rgb = {
      r: clampByte(Number(rgbMatch[1])),
      g: clampByte(Number(rgbMatch[2])),
      b: clampByte(Number(rgbMatch[3]))
    }
    return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) }
  }

  const hslMatch = /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%/i.exec(text)
  if (hslMatch) {
    const hsl: Hsl = {
      h: Number(hslMatch[1]) % 360,
      s: Math.min(100, Math.max(0, Number(hslMatch[2]))),
      l: Math.min(100, Math.max(0, Number(hslMatch[3])))
    }
    const rgb = hslToRgb(hsl)
    return { hex: rgbToHex(rgb), rgb, hsl }
  }

  throw new Error('Invalid color.\n\nUse HEX, RGB, or HSL.')
}

export function toRgbString({ r, g, b }: Rgb): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`
}

export function toHslString({ h, s, l }: Hsl): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sat = s / 100
  const light = l / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const huePrime = ((h % 360) + 360) % 360 / 60
  const x = chroma * (1 - Math.abs(huePrime % 2 - 1))
  let r = 0
  let g = 0
  let b = 0

  if (huePrime < 1) {
    r = chroma
    g = x
  } else if (huePrime < 2) {
    r = x
    g = chroma
  } else if (huePrime < 3) {
    g = chroma
    b = x
  } else if (huePrime < 4) {
    g = x
    b = chroma
  } else if (huePrime < 5) {
    r = x
    b = chroma
  } else {
    r = chroma
    b = x
  }

  const match = light - chroma / 2
  return {
    r: clampByte((r + match) * 255),
    g: clampByte((g + match) * 255),
    b: clampByte((b + match) * 255)
  }
}
