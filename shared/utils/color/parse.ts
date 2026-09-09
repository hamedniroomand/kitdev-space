import type { Hsl, Oklch, ParsedColor, Rgb } from './types'
import { hslToRgb, rgbToHsl } from './convert'
import { oklchToRgb, rgbToOklch } from './oklch'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

/** Writes an 8-digit hex when the color has alpha, so the alpha value stays. */
export function rgbToHex({ r, g, b, a }: Rgb): string {
  const channels = a !== undefined && a < 1 ? [r, g, b, a * 255] : [r, g, b]
  return `#${channels.map(value => clampByte(value).toString(16).padStart(2, '0')).join('')}`
}

function describe(rgb: Rgb, hsl?: Hsl, oklchInput?: Oklch, alpha?: number): ParsedColor {
  const finalRgb: Rgb = alpha !== undefined && alpha < 1 ? { ...rgb, a: alpha } : { ...rgb }
  const computedHsl = hsl ?? rgbToHsl(rgb)
  const finalHsl: Hsl = alpha !== undefined && alpha < 1 ? { ...computedHsl, a: alpha } : { ...computedHsl }
  const computedOklch = oklchInput ?? rgbToOklch(rgb)
  const finalOklch: Oklch = alpha !== undefined && alpha < 1 ? { ...computedOklch, a: alpha } : { ...computedOklch }

  return {
    hex: rgbToHex(finalRgb),
    rgb: finalRgb,
    hsl: finalHsl,
    oklch: finalOklch,
    alpha: alpha !== undefined && alpha < 1 ? alpha : undefined,
  }
}

const NAMED_COLORS: Record<string, string> = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  grey: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  transparent: '#00000000',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
}

function parseHue(val: string): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'none') {
    return 0
  }
  let deg = 0
  if (trimmed.endsWith('deg')) {
    deg = Number.parseFloat(trimmed.slice(0, -3))
  }
  else if (trimmed.endsWith('grad')) {
    deg = Number.parseFloat(trimmed.slice(0, -4)) * (360 / 400)
  }
  else if (trimmed.endsWith('rad')) {
    deg = Number.parseFloat(trimmed.slice(0, -3)) * (180 / Math.PI)
  }
  else if (trimmed.endsWith('turn')) {
    deg = Number.parseFloat(trimmed.slice(0, -4)) * 360
  }
  else {
    deg = Number.parseFloat(trimmed)
  }
  if (Number.isNaN(deg)) {
    throw new TypeError(`Invalid hue value: "${val}"`)
  }
  return ((deg % 360) + 360) % 360
}

function parseAlpha(val: string): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'none') {
    return 1
  }
  let num: number
  if (trimmed.endsWith('%')) {
    num = Number.parseFloat(trimmed.slice(0, -1)) / 100
  }
  else {
    num = Number.parseFloat(trimmed)
  }
  if (Number.isNaN(num)) {
    throw new TypeError(`Invalid alpha value: "${val}"`)
  }
  return Math.min(1, Math.max(0, Math.round(num * 1000) / 1000))
}

function parseRgbChannel(val: string): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'none') {
    return 0
  }
  if (trimmed.endsWith('%')) {
    return clampByte((Number.parseFloat(trimmed.slice(0, -1)) / 100) * 255)
  }
  return clampByte(Number.parseFloat(trimmed))
}

function parsePercentage(val: string): number {
  const trimmed = val.trim().toLowerCase()
  if (trimmed === 'none') {
    return 0
  }
  const num = trimmed.endsWith('%')
    ? Number.parseFloat(trimmed.slice(0, -1))
    : Number.parseFloat(trimmed)
  return Math.min(100, Math.max(0, num))
}

export function parseColor(input: string): ParsedColor {
  const text = input.trim()
  const lower = text.toLowerCase()

  if (NAMED_COLORS[lower]) {
    return parseColor(NAMED_COLORS[lower]!)
  }

  const hexMatch = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text)
  if (hexMatch) {
    const raw = hexMatch[1]!
    let full: string
    let alphaValue: number | undefined
    if (raw.length === 3) {
      full = raw.split('').map(char => char + char).join('')
    }
    else if (raw.length === 4) {
      const chars = raw.split('')
      full = chars.slice(0, 3).map(char => char + char).join('')
      alphaValue = Math.round((Number.parseInt(chars[3]! + chars[3]!, 16) / 255) * 1000) / 1000
    }
    else if (raw.length === 6) {
      full = raw
    }
    else {
      full = raw.slice(0, 6)
      alphaValue = Math.round((Number.parseInt(raw.slice(6, 8), 16) / 255) * 1000) / 1000
    }

    const rgb: Rgb = {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    }
    return describe(rgb, undefined, undefined, alphaValue)
  }

  const funcMatch = /^(rgba?|hsla?|oklch)\((.*)\)$/i.exec(text)
  if (funcMatch) {
    const fn = funcMatch[1]!.toLowerCase()
    const rawArgs = funcMatch[2]!.trim()

    let channelsStr = rawArgs
    let alphaValue: number | undefined

    if (rawArgs.includes('/')) {
      const slashParts = rawArgs.split('/')
      if (slashParts.length !== 2) {
        throw new Error('Invalid syntax: multiple slashes in color')
      }
      channelsStr = slashParts[0]!.trim()
      alphaValue = parseAlpha(slashParts[1]!)
    }

    let parts: string[]
    if (channelsStr.includes(',')) {
      parts = channelsStr.split(',').map(s => s.trim()).filter(Boolean)
      if (alphaValue === undefined && parts.length === 4) {
        alphaValue = parseAlpha(parts.pop()!)
      }
    }
    else {
      parts = channelsStr.split(/\s+/).map(s => s.trim()).filter(Boolean)
      if (alphaValue === undefined && parts.length === 4) {
        alphaValue = parseAlpha(parts.pop()!)
      }
    }

    if (parts.length !== 3) {
      throw new Error(`Invalid color arguments: expected 3 channels, got ${parts.length}`)
    }

    if (fn.startsWith('rgb')) {
      const rgb: Rgb = {
        r: parseRgbChannel(parts[0]!),
        g: parseRgbChannel(parts[1]!),
        b: parseRgbChannel(parts[2]!),
      }
      return describe(rgb, undefined, undefined, alphaValue)
    }

    if (fn.startsWith('hsl')) {
      const hsl: Hsl = {
        h: parseHue(parts[0]!),
        s: parsePercentage(parts[1]!),
        l: parsePercentage(parts[2]!),
      }
      return describe(hslToRgb(hsl), hsl, undefined, alphaValue)
    }

    if (fn === 'oklch') {
      const rawLStr = parts[0]!
      const isPercent = rawLStr.endsWith('%')
      const rawL = rawLStr.toLowerCase() === 'none' ? 0 : Number.parseFloat(rawLStr)
      const lightness = isPercent || rawL > 1.0
        ? Math.min(100, Math.max(0, rawL))
        : Math.min(100, Math.max(0, rawL * 100))

      const rawCStr = parts[1]!
      const chroma = rawCStr.toLowerCase() === 'none'
        ? 0
        : rawCStr.endsWith('%')
          ? (Number.parseFloat(rawCStr.slice(0, -1)) / 100) * 0.4
          : Math.max(0, Number.parseFloat(rawCStr))

      const oklch: Oklch = {
        l: lightness,
        c: chroma,
        h: parseHue(parts[2]!),
      }
      return describe(oklchToRgb(oklch), undefined, oklch, alphaValue)
    }
  }

  throw new Error('Invalid color.\n\nUse HEX, RGB, HSL, or OKLCH.')
}

export function toRgbString({ r, g, b, a }: Rgb): string {
  if (a !== undefined && a < 1) {
    return `rgb(${clampByte(r)} ${clampByte(g)} ${clampByte(b)} / ${a})`
  }
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`
}

export function toHslString({ h, s, l, a }: Hsl): string {
  if (a !== undefined && a < 1) {
    return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
}
