import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  convertImage,
  convertSvgAtScale,
  getImageMetadata,
  resizeImage,
  transformImage
} from '../../../server/utils/image/pipeline'

const fixture = new Uint8Array(
  readFileSync(join(import.meta.dir, 'fixtures/tiny.png'))
)

describe('image pipeline', () => {
  it('reads metadata', async () => {
    const meta = await getImageMetadata(fixture)
    expect(meta.width).toBeGreaterThan(0)
    expect(meta.height).toBeGreaterThan(0)
    expect(meta.format).toBeTruthy()
  })

  it('converts to webp', async () => {
    const out = await convertImage(fixture, { format: 'webp', quality: 80 })
    expect(out.bytes.byteLength).toBeGreaterThan(0)
    expect(out.mime).toBe('image/webp')
  })

  it('resizes inside box', async () => {
    const out = await resizeImage(fixture, {
      width: 32,
      height: 32,
      fit: 'inside',
      format: 'png'
    })
    expect(out.width).toBeLessThanOrEqual(32)
    expect(out.height).toBeLessThanOrEqual(32)
  })

  it('applies grayscale', async () => {
    const out = await transformImage(fixture, { grayscale: true, format: 'png' })
    expect(out.bytes.byteLength).toBeGreaterThan(0)
  })

  const svg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8"><rect width="16" height="8" fill="#abc"/></svg>'
  )

  it('converts svg to webp', async () => {
    const out = await convertImage(svg, { format: 'webp', quality: 80 })
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
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://example.com/a.png" width="10" height="10"/></svg>'
    )
    expect(convertImage(bad, { format: 'png' })).rejects.toThrow(/external resource/i)
  })

  it('resizes svg inside box', async () => {
    const out = await resizeImage(svg, {
      width: 32,
      height: 32,
      fit: 'inside',
      format: 'png'
    })
    expect(out.width).toBeLessThanOrEqual(32)
    expect(out.height).toBeLessThanOrEqual(32)
    expect(out.bytes.byteLength).toBeGreaterThan(0)
  })

  it('rasterizes large svg toward resize target', async () => {
    const large = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1000"><rect width="2000" height="1000" fill="#123"/></svg>'
    )
    const out = await resizeImage(large, {
      width: 40,
      height: 40,
      fit: 'inside',
      format: 'png'
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
})
