import { describe, expect, it } from 'vitest'
import { initialCrop, MIN_CROP_SIZE, moveCrop, resizeCrop } from '#shared/utils/image/crop'

describe('crop math', () => {
  it('starts with the whole image when there is no aspect', () => {
    expect(initialCrop(800, 600)).toEqual({ x: 0, y: 0, width: 800, height: 600 })
    expect(initialCrop(800, 600, null)).toEqual({ x: 0, y: 0, width: 800, height: 600 })
  })

  it('starts with the largest centered box of the aspect', () => {
    expect(initialCrop(1000, 1000, 2)).toEqual({ x: 0, y: 250, width: 1000, height: 500 })
    expect(initialCrop(1000, 1000, 0.5)).toEqual({ x: 250, y: 0, width: 500, height: 1000 })
    expect(initialCrop(1200, 630, 1200 / 630)).toEqual({ x: 0, y: 0, width: 1200, height: 630 })
  })

  it('moves the box and keeps it inside the image', () => {
    const rect = { x: 10, y: 10, width: 100, height: 50 }
    expect(moveCrop(rect, 5, 5, 800, 600)).toEqual({ x: 15, y: 15, width: 100, height: 50 })
    expect(moveCrop(rect, -50, -50, 800, 600)).toEqual({ x: 0, y: 0, width: 100, height: 50 })
    expect(moveCrop(rect, 10000, 10000, 800, 600)).toEqual({ x: 700, y: 550, width: 100, height: 50 })
  })

  it('resizes from a corner and keeps the opposite corner fixed', () => {
    const rect = { x: 100, y: 100, width: 200, height: 100 }
    expect(resizeCrop(rect, 'se', 50, 20, 800, 600)).toEqual({ x: 100, y: 100, width: 250, height: 120 })
    expect(resizeCrop(rect, 'nw', -50, -20, 800, 600)).toEqual({ x: 50, y: 80, width: 250, height: 120 })
    expect(resizeCrop(rect, 'ne', 50, -20, 800, 600)).toEqual({ x: 100, y: 80, width: 250, height: 120 })
    expect(resizeCrop(rect, 'sw', -50, 20, 800, 600)).toEqual({ x: 50, y: 100, width: 250, height: 120 })
  })

  it('never crosses the image edge or the minimum size', () => {
    const rect = { x: 100, y: 100, width: 200, height: 100 }
    expect(resizeCrop(rect, 'se', 10000, 10000, 800, 600)).toEqual({ x: 100, y: 100, width: 700, height: 500 })
    expect(resizeCrop(rect, 'se', -10000, -10000, 800, 600)).toEqual({ x: 100, y: 100, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE })
  })

  it('keeps the aspect during a resize', () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 }
    const grown = resizeCrop(rect, 'se', 200, 0, 1000, 1000, 2)
    expect(grown).toEqual({ x: 0, y: 0, width: 400, height: 200 })

    const clamped = resizeCrop(rect, 'se', 5000, 0, 1000, 300, 2)
    expect(clamped.width / clamped.height).toBeCloseTo(2, 1)
    expect(clamped.height).toBeLessThanOrEqual(300)
  })
})
