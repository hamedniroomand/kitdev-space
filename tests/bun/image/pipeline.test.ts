import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  convertImage,
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

  it('rejects svg with a clear error', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    )
    expect(convertImage(svg, { format: 'png' })).rejects.toThrow(/SVG is not supported/)
  })
})
