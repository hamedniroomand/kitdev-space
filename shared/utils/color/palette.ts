import type { Hsl } from './types'
import { hslToRgb } from './convert'
import { parseColor, rgbToHex } from './parse'

export function createPalette(base: string, count = 5): string[] {
  const size = Math.min(12, Math.max(3, Math.floor(count)))
  const { hsl } = parseColor(base)
  const start = Math.max(8, hsl.l - 30)
  const end = Math.min(92, hsl.l + 30)
  const step = size === 1 ? 0 : (end - start) / (size - 1)

  return Array.from({ length: size }, (_, index) => {
    const next: Hsl = {
      h: hsl.h,
      s: hsl.s,
      l: start + step * index,
    }
    return rgbToHex(hslToRgb(next))
  })
}
