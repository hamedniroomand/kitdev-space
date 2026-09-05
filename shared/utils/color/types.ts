export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

export interface ParsedColor {
  hex: string
  rgb: Rgb
  hsl: Hsl
}
