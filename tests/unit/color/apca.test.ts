import { describe, expect, it } from 'vitest'
import { apcaContrast, apcaLevel } from '#shared/utils/color/apca'

type Fixture = [text: string, background: string, lc: number]

/**
 * The published keystone checks of APCA algorithm 0.0.98G-4g. They come from
 * the "TEXT vs BKGND • EXPECTED RESULT" block of the official test page, with
 * no rounding. They exercise both polarities, the black clamp, and the low
 * clip.
 * @see https://github.com/Myndex/apca-w3/blob/master/test/test.html
 */
const KEYSTONE: Fixture[] = [
  ['#888', '#fff', 63.056469930209424],
  ['#fff', '#888', -68.54146436644962],
  ['#000', '#aaa', 58.146262578561334],
  ['#aaa', '#000', -56.24113336839742],
  ['#123', '#def', 91.66830811481631],
  ['#def', '#123', -93.06770049484275],
  ['#123', '#444', 8.32326136957393],
  ['#444', '#123', -7.526878460278154],
]

/**
 * The published black and white extremes. They come from the APCA
 * documentation, not from the official test page, so they hold fewer digits.
 * @see https://apcacontrast.com/
 */
const EXTREMES: Fixture[] = [
  ['#000', '#fff', 106.0406668287],
  ['#fff', '#000', -107.8847261151],
]

describe('apcaContrast', () => {
  for (const [text, background, lc] of KEYSTONE) {
    it(`scores ${text} on ${background} at Lc ${lc}`, () => {
      expect(apcaContrast(text, background)).toBeCloseTo(lc, 6)
    })
  }

  for (const [text, background, lc] of EXTREMES) {
    it(`scores ${text} on ${background} at Lc ${lc}`, () => {
      expect(apcaContrast(text, background)).toBeCloseTo(lc, 4)
    })
  }

  it('returns 0 for the same color', () => {
    expect(apcaContrast('#7c3aed', '#7c3aed')).toBe(0)
  })
})

describe('apcaLevel', () => {
  it('gives the highest level that a score reaches', () => {
    expect(apcaLevel(91.7)?.lc).toBe(90)
    expect(apcaLevel(-68.5)?.lc).toBe(60)
    expect(apcaLevel(8.3)).toBeNull()
  })
})
