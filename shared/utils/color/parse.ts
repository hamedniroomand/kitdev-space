import type { Hsl, Oklch, ParsedColor, Rgb } from './types'
import { rgbToHsl } from './convert'
import { oklchToRgb, rgbToOklch } from './oklch'

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map(value => clampByte(value).toString(16).padStart(2, '0')).join('')}`
}

function describe(rgb: Rgb, hsl?: Hsl): ParsedColor {
  return {
    hex: rgbToHex(rgb),
    rgb,
    hsl: hsl ?? rgbToHsl(rgb),
    oklch: rgbToOklch(rgb),
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
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
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
    const full = (raw.length === 3 || raw.length === 4)
      ? raw.split('').map(char => char + char).join('')
      : raw
    const rgb = {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    }
    return describe(rgb)
  }

  const rgbMatch = /^rgba?\(\s*([0-9.]+%?)[\s,]+([0-9.]+%?)[\s,]+([0-9.]+%?)(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i.exec(text)
  if (rgbMatch) {
    const parseChannel = (val: string) => {
      if (val.endsWith('%')) {
        return clampByte(Number.parseFloat(val) * 2.55)
      }
      return clampByte(Number.parseFloat(val))
    }
    const rgb = {
      r: parseChannel(rgbMatch[1]!),
      g: parseChannel(rgbMatch[2]!),
      b: parseChannel(rgbMatch[3]!),
    }
    return describe(rgb)
  }

  const hslMatch = /^hsla?\(\s*([0-9.]+(?:deg)?)[\s,]+([0-9.]+)%[\s,]+([0-9.]+)%(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i.exec(text)
  if (hslMatch) {
    const hRaw = Number.parseFloat(hslMatch[1]!)
    const hsl: Hsl = {
      h: ((hRaw % 360) + 360) % 360,
      s: Math.min(100, Math.max(0, Number.parseFloat(hslMatch[2]!))),
      l: Math.min(100, Math.max(0, Number.parseFloat(hslMatch[3]!))),
    }
    return describe(hslToRgb(hsl), hsl)
  }

  const oklchMatch = /^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i.exec(text)
  if (oklchMatch) {
    const rawLStr = oklchMatch[1]!
    const isPercent = rawLStr.endsWith('%')
    const rawL = Number.parseFloat(rawLStr)
    const lightness = isPercent || rawL > 1.0
      ? Math.min(100, Math.max(0, rawL))
      : Math.min(100, Math.max(0, rawL * 100))

    const oklch: Oklch = {
      l: lightness,
      c: Math.max(0, Number.parseFloat(oklchMatch[2]!)),
      h: ((Number.parseFloat(oklchMatch[3]!) % 360) + 360) % 360,
    }
    return describe(oklchToRgb(oklch))
  }

  throw new Error('Invalid color.\n\nUse HEX, RGB, HSL, or OKLCH.')
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
