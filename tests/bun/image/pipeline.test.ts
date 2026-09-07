import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import {
  convertSvgAtScale,
  getImageMetadata,
  mapImageCause,
  processImage,
} from '#server/utils/image/pipeline'

const fixture = new Uint8Array(
  readFileSync(join(import.meta.dir, 'fixtures/tiny.png')),
)

describe('image pipeline', () => {
  it('reads metadata', async () => {
    const meta = await getImageMetadata(fixture)
    expect(meta.width).toBeGreaterThan(0)
    expect(meta.height).toBeGreaterThan(0)
    expect(meta.format).toBeTruthy()
  })

  it('converts to webp', async () => {
    const out = await processImage(fixture, { format: 'webp', quality: 80 })
    expect(out.bytes.byteLength).toBeGreaterThan(0)
    expect(out.mime).toBe('image/webp')
  })

  it('resizes inside box', async () => {
    const out = await processImage(fixture, {
      width: 32,
      height: 32,
      fit: 'inside',
      format: 'png',
    })
    expect(out.width).toBeLessThanOrEqual(32)
    expect(out.height).toBeLessThanOrEqual(32)
  })

  it('applies grayscale', async () => {
    const out = await processImage(fixture, { grayscale: true, format: 'png' })
    expect(out.bytes.byteLength).toBeGreaterThan(0)
  })

  const svg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8"><rect width="16" height="8" fill="#abc"/></svg>',
  )

  it('converts svg to webp', async () => {
    const out = await processImage(svg, { format: 'webp', quality: 80 })
    expect(out.bytes.byteLength).toBeGreaterThan(0)
    expect(out.mime).toBe('image/webp')
    expect(out.width).toBeGreaterThan(0)
    expect(out.height).toBeGreaterThan(0)
  })

  it('reads metadata from svg', async () => {
    const meta = await getImageMetadata(svg)
    expect(meta.width).toBeGreaterThan(0)
    expect(meta.height).toBeGreaterThan(0)
    expect(String(meta.format).toLowerCase()).toContain('png')
  })

  it('rejects svg with remote resource', async () => {
    const bad = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://example.com/a.png" width="10" height="10"/></svg>',
    )
    expect(processImage(bad, { format: 'png' })).rejects.toThrow(/external resource/i)
  })

  it('resizes svg inside box', async () => {
    const out = await processImage(svg, {
      width: 32,
      height: 32,
      fit: 'inside',
      format: 'png',
    })
    expect(out.width).toBeLessThanOrEqual(32)
    expect(out.height).toBeLessThanOrEqual(32)
    expect(out.bytes.byteLength).toBeGreaterThan(0)
  })

  it('rasterizes large svg toward resize target', async () => {
    const large = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1000"><rect width="2000" height="1000" fill="#123"/></svg>',
    )
    const out = await processImage(large, {
      width: 40,
      height: 40,
      fit: 'inside',
      format: 'png',
    })
    expect(out.width).toBeLessThanOrEqual(40)
    expect(out.height).toBeLessThanOrEqual(40)
  })

  it('converts svg at 2x scale to png', async () => {
    const out = await convertSvgAtScale(svg, { scale: 2, format: 'png' })
    expect(out.mime).toBe('image/png')
    expect(out.width).toBe(32)
    expect(out.height).toBe(16)
  })

  it('resizes, rotates, and converts in one pass', async () => {
    const out = await processImage(fixture, {
      width: 40,
      height: 20,
      fit: 'fill',
      rotate: 90,
      grayscale: true,
      format: 'webp',
      quality: 70,
    })
    // Rotation runs first, so the requested size is the final size.
    expect(out.width).toBe(40)
    expect(out.height).toBe(20)
    expect(out.mime).toBe('image/webp')
  })

  it('keeps the original size when no size is given', async () => {
    const meta = await getImageMetadata(fixture)
    const out = await processImage(fixture, { format: 'png' })
    expect(out.width).toBe(meta.width)
    expect(out.height).toBe(meta.height)
  })

  it('rejects a size that is out of range', async () => {
    expect(processImage(fixture, { width: 0, height: 10, format: 'png' }))
      .rejects
      .toThrow(/Width must be/)
    expect(processImage(fixture, { width: 10, height: 99999, format: 'png' }))
      .rejects
      .toThrow(/Height must be/)
  })

  it('reports 16 megapixels cap when ERR_IMAGE_TOO_MANY_PIXELS occurs', () => {
    const error = mapImageCause({ code: 'ERR_IMAGE_TOO_MANY_PIXELS' }, 'Fallback')
    expect(error.message).toContain('16 megapixels')
    expect(error.message).toContain('4096 × 4096')
  })
})
