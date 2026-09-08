import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readImageMetadata } from '#shared/utils/image/exif'

describe('image fixtures', () => {
  it('parses EXIF orientation-6 JPEG fixture', () => {
    const bytes = new Uint8Array(readFileSync('tests/fixtures/images/orientation-6.jpg'))
    const meta = readImageMetadata(bytes)
    expect(meta.container).toBe('jpeg')
    expect(meta.width).toBe(100)
    expect(meta.height).toBe(50)
    const orientationTag = meta.tags.find(t => t.name === 'Orientation')
    expect(orientationTag).toBeDefined()
    expect(orientationTag?.value).toBe('Rotate 90°')
  })

  it('validates AVIF fixture exists and identifies as avif', () => {
    const bytes = new Uint8Array(readFileSync('tests/fixtures/images/exif.avif'))
    const meta = readImageMetadata(bytes)
    expect(meta.container).toBe('avif')
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('validates non-square favicon fixture dimensions', () => {
    const bytes = new Uint8Array(readFileSync('tests/fixtures/images/non-square-favicon.png'))
    const meta = readImageMetadata(bytes)
    expect(meta.container).toBe('png')
    expect(meta.width).toBe(64)
    expect(meta.height).toBe(32)
    expect(meta.width).not.toBe(meta.height)
  })

  it('validates SVG fixture contains text tag', () => {
    const svg = readFileSync('tests/fixtures/images/text.svg', 'utf-8')
    expect(svg).toContain('<text')
    expect(svg).toContain('Hello KitDev')
  })
})
