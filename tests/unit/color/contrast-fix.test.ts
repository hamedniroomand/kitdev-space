import { describe, expect, it } from 'vitest'
import { contrastRatio } from '#shared/utils/color/contrast'
import { suggestLightnessFix } from '#shared/utils/color/contrast-fix'
import { rgbToOklch } from '#shared/utils/color/oklch'
import { parseColor } from '#shared/utils/color/parse'

/** Each pair fails AA, and one lightness change can make it pass AAA. */
const FAILING_PAIRS: Array<[string, string]> = [
  ['#ffffff', '#a78bfa'],
  ['#f59e0b', '#ffffff'],
  ['#111111', '#000000'],
  ['#06b6d4', '#a3e635'],
  ['#999999', '#ffffff'],
  ['#4ade80', '#22c55e'],
]

function hue(color: string): number {
  return rgbToOklch(parseColor(color).rgb).h
}

describe('suggestLightnessFix', () => {
  for (const target of [4.5, 7]) {
    for (const [foreground, background] of FAILING_PAIRS) {
      it(`reaches ${target}:1 for ${foreground} on ${background}`, () => {
        expect(contrastRatio(foreground, background)).toBeLessThan(target)

        const fix = suggestLightnessFix(foreground, background, target)
        expect(fix).not.toBeNull()

        const other = fix!.target === 'foreground' ? background : foreground
        expect(contrastRatio(fix!.hex, other)).toBeGreaterThanOrEqual(target)
        expect(fix!.ratio).toBeGreaterThanOrEqual(target)
      })
    }
  }

  it('returns null when the pair already passes', () => {
    expect(suggestLightnessFix('#000000', '#ffffff', 7)).toBeNull()
  })

  it('keeps the hue of the color that it changes', () => {
    const fix = suggestLightnessFix('#ffffff', '#7c3aed', 7)
    expect(fix?.target).toBe('background')
    expect(hue(fix!.hex)).toBeCloseTo(hue('#7c3aed'), 0)
  })

  it('changes the color that needs the smaller lightness change', () => {
    const fix = suggestLightnessFix('#ffffff', '#f5f5f5', 4.5)
    expect(fix?.target).toBe('background')
  })

  it('finds a fix for a gray pair that must pass a mid gray', () => {
    const fix = suggestLightnessFix('#777777', '#888888', 4.5)
    expect(fix?.delta).toBeGreaterThan(0)
  })
})
