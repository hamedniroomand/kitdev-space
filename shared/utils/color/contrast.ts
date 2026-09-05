import { parseColor } from './parse'
import type { Rgb } from './types'

function channel(value: number): number {
  const next = value / 255
  return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(parseColor(a).rgb)
  const second = relativeLuminance(parseColor(b).rgb)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export function wcagLevel(ratio: number, largeText = false): { aa: boolean, aaa: boolean } {
  if (largeText) {
    return {
      aa: ratio >= 3,
      aaa: ratio >= 4.5
    }
  }

  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7
  }
}
