import { describe, expect, it } from 'vitest'
import { contrastRatio, wcagLevel } from '#shared/utils/color/contrast'

describe('contrast', () => {
  it('scores black on white near 21', () => {
    const ratio = contrastRatio('#000000', '#ffffff')
    expect(ratio).toBeGreaterThan(20)
    expect(wcagLevel(ratio)).toEqual({ aa: true, aaa: true })
  })
})
