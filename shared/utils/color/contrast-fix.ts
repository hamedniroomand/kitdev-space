import type { Oklch } from './types'
import { contrastRatio } from './contrast'
import { oklchToRgb, rgbToOklch } from './oklch'
import { parseColor, rgbToHex } from './parse'

export interface LightnessFix {
  /** The color that the fix changes. */
  target: 'foreground' | 'background'
  /** The new color as a hex string. */
  hex: string
  /** The contrast ratio that the new color gives. */
  ratio: number
  /** The change of the OKLCH lightness channel, 0 to 100. */
  delta: number
}

function hexAtLightness(base: Oklch, l: number): string {
  return rgbToHex(oklchToRgb({ ...base, l }))
}

/**
 * Find the lightness that is nearest to the base and reaches the target ratio.
 *
 * The ratio is not monotonic in the lightness, because the color can pass the
 * other color. The test "the ratio reaches the target" is still monotonic in
 * the distance from the base, so a binary search is correct. The search tests
 * the final hex value, so the result always passes after the 8-bit rounding.
 */
function search(base: Oklch, other: string, target: number, bound: number): number | null {
  const passes = (l: number) => contrastRatio(hexAtLightness(base, l), other) >= target

  if (!passes(bound)) {
    return null
  }

  let low = base.l
  let high = bound

  // 30 halvings of a 100 unit range end below 1e-7.
  for (let step = 0; step < 30; step += 1) {
    const middle = (low + high) / 2
    if (passes(middle)) {
      high = middle
    }
    else {
      low = middle
    }
  }

  return high
}

/**
 * Suggest the smallest lightness change that makes a color pair pass a ratio.
 *
 * The hue and the chroma do not change. The function tests the foreground and
 * the background, in both directions, and returns the smallest change.
 * It returns null when the pair already passes, or when no lightness passes.
 */
export function suggestLightnessFix(
  foreground: string,
  background: string,
  targetRatio: number,
): LightnessFix | null {
  if (contrastRatio(foreground, background) >= targetRatio) {
    return null
  }

  const pairs = [
    ['foreground', foreground, background],
    ['background', background, foreground],
  ] as const

  let best: LightnessFix | null = null

  for (const [target, color, other] of pairs) {
    const base = rgbToOklch(parseColor(color).rgb)

    for (const bound of [100, 0]) {
      const lightness = search(base, other, targetRatio, bound)
      if (lightness === null) {
        continue
      }

      const hex = hexAtLightness(base, lightness)
      const candidate: LightnessFix = {
        target,
        hex,
        ratio: contrastRatio(hex, other),
        delta: Math.abs(lightness - base.l),
      }

      if (!best || candidate.delta < best.delta) {
        best = candidate
      }
    }
  }

  return best
}
