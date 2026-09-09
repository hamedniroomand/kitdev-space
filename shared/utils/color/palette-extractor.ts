export interface ExtractedColor {
  hex: string
  rgb: { r: number, g: number, b: number }
  count: number
  percentage: number
  isDark: boolean
}

export function extractPaletteFromPixels(
  pixels: Uint8ClampedArray | Uint8Array,
  colorCount = 8,
  minDistance = 32,
): ExtractedColor[] {
  const colorMap = new Map<number, { count: number, r: number, g: number, b: number }>()
  let validCount = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!
    const a = pixels[i + 3]!

    // Skip a pixel under ten percent alpha
    if (a < 26)
      continue
    validCount++

    // Quantize channels by grouping into buckets of 16
    const qr = Math.round(r / 16) * 16
    const qg = Math.round(g / 16) * 16
    const qb = Math.round(b / 16) * 16

    const key = (qr << 16) | (qg << 8) | qb
    const existing = colorMap.get(key)
    if (existing) {
      existing.count++
      existing.r += r
      existing.g += g
      existing.b += b
    }
    else {
      colorMap.set(key, { count: 1, r, g, b })
    }
  }

  if (validCount === 0) {
    return []
  }

  const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count)
  const palette: ExtractedColor[] = []

  for (const item of sorted) {
    const avgR = Math.round(item.r / item.count)
    const avgG = Math.round(item.g / item.count)
    const avgB = Math.round(item.b / item.count)

    // Merge a color that sits closer than the minimum distance
    const isDuplicate = palette.some((c) => {
      const dist = Math.hypot(c.rgb.r - avgR, c.rgb.g - avgG, c.rgb.b - avgB)
      return dist < minDistance
    })

    if (!isDuplicate) {
      const hex = `#${[avgR, avgG, avgB]
        .map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
        .join('')}`

      // Standard perceptual luminance
      const luminance = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255
      const percentage = Math.max(1, Math.round((item.count / validCount) * 100))

      palette.push({
        hex,
        rgb: { r: avgR, g: avgG, b: avgB },
        count: item.count,
        percentage,
        isDark: luminance < 0.55,
      })

      if (palette.length >= colorCount)
        break
    }
  }

  return palette
}
