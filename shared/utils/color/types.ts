export interface Rgb {
  r: number
  g: number
  b: number
  a?: number
}

export interface Hsl {
  h: number
  s: number
  l: number
  a?: number
}

export interface Oklch {
  /** Perceived lightness, 0 to 100. */
  l: number
  /** Chroma. 0 is gray. The maximum depends on the hue. */
  c: number
  /** Hue angle in degrees, 0 to 360. */
  h: number
  a?: number
}

export interface ParsedColor {
  hex: string
  rgb: Rgb
  hsl: Hsl
  oklch: Oklch
  alpha?: number
}
