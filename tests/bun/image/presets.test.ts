import { describe, expect, it } from 'bun:test'
import { IMAGE_PRESETS } from '#server/utils/image/presets'

describe('IMAGE_PRESETS', () => {
  it('includes open-graph 1200x630', () => {
    expect(IMAGE_PRESETS['open-graph']).toEqual({
      width: 1200,
      height: 630,
      label: 'OpenGraph',
    })
  })
})
