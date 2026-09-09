import type { Rgb } from './types'
import { parseColor } from './parse'

/**
 * APCA, the Accessible Perceptual Contrast Algorithm.
 *
 * It is a draft candidate for WCAG 3. It is not a W3C recommendation.
 *
 * Algorithm version 0.0.98G-4g, from library APCA-W3 0.1.9.
 * @see https://github.com/Myndex/apca-w3
 * @see https://git.apcacontrast.com/documentation/APCAeasyIntro.html
 */

const S_RED = 0.2126729
const S_GREEN = 0.7151522
const S_BLUE = 0.0721750
const MAIN_TRC = 2.4

const NORM_BG = 0.56
const NORM_TXT = 0.57
const REV_TXT = 0.62
const REV_BG = 0.65

const BLACK_THRESHOLD = 0.022
const BLACK_CLAMP = 1.414
const SCALE = 1.14
const LOW_OFFSET = 0.027
const DELTA_Y_MIN = 0.0005
const LOW_CLIP = 0.1

/**
 * Screen luminance for APCA.
 *
 * It uses a simple power curve. It does not use the piecewise sRGB curve of
 * `relativeLuminance`, so the two values are not the same.
 */
function screenLuminance({ r, g, b }: Rgb): number {
  const curve = (channel: number) => (channel / 255) ** MAIN_TRC
  return S_RED * curve(r) + S_GREEN * curve(g) + S_BLUE * curve(b)
}

/** A color that is near black gets a soft clamp. */
function clampBlack(y: number): number {
  return y > BLACK_THRESHOLD ? y : y + (BLACK_THRESHOLD - y) ** BLACK_CLAMP
}

/**
 * The APCA lightness contrast, Lc.
 *
 * A positive value is dark text on a light background. A negative value is
 * light text on a dark background. The range is about -108 to 106.
 */
export function apcaContrast(text: string, background: string): number {
  const textY = clampBlack(screenLuminance(parseColor(text).rgb))
  const backgroundY = clampBlack(screenLuminance(parseColor(background).rgb))

  if (Math.abs(backgroundY - textY) < DELTA_Y_MIN) {
    return 0
  }

  if (backgroundY > textY) {
    const sapc = (backgroundY ** NORM_BG - textY ** NORM_TXT) * SCALE
    return sapc < LOW_CLIP ? 0 : (sapc - LOW_OFFSET) * 100
  }

  const sapc = (backgroundY ** REV_BG - textY ** REV_TXT) * SCALE
  return sapc > -LOW_CLIP ? 0 : (sapc + LOW_OFFSET) * 100
}

export interface ApcaLevel {
  /** The minimum absolute Lc score of the level. */
  lc: number
  /** The text or the object that the level supports. */
  use: string
}

/**
 * The draft APCA font size thresholds.
 * @see https://git.apcacontrast.com/documentation/APCAeasyIntro.html
 */
export const APCA_LEVELS: ApcaLevel[] = [
  { lc: 90, use: 'Body text, 14px regular and larger' },
  { lc: 75, use: 'Columns of body text, 18px regular and larger' },
  { lc: 60, use: 'Other content text, 24px regular or 16px bold' },
  { lc: 45, use: 'Headlines, 36px regular or 24px bold' },
  { lc: 30, use: 'Placeholder text and disabled text' },
  { lc: 15, use: 'Non-text objects, 5px and larger' },
]

/** The highest draft level that a score reaches. It returns null below Lc 15. */
export function apcaLevel(lc: number): ApcaLevel | null {
  const score = Math.abs(lc)
  return APCA_LEVELS.find(level => score >= level.lc) ?? null
}
