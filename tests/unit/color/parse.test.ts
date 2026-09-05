import { describe, expect, it } from 'vitest'
import { parseColor, toHslString, toRgbString } from '../../../shared/utils/color/parse'

describe('parseColor', () => {
  it('parses hex colors', () => {
    const color = parseColor('#ffffff')
    expect(color.hex).toBe('#ffffff')
    expect(toRgbString(color.rgb)).toBe('rgb(255, 255, 255)')
    expect(toHslString(color.hsl)).toContain('hsl(')
  })
})
