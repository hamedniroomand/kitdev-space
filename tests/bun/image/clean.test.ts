import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { cleanImageMetadata } from '#server/utils/image/clean'
import { readImageMetadata } from '#shared/utils/image/exif'
import { buildTiffBlock } from '../../unit/image/fixtures'

const tiny = new Uint8Array(readFileSync(join(import.meta.dir, 'fixtures/tiny.png')))

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2
  return [0xFF, marker, length >> 8, length & 0xFF, ...payload]
}

/** A real JPEG from Bun, with an EXIF block that holds a GPS position and a comment block. */
async function taggedJpeg(): Promise<Uint8Array> {
  const jpeg = await new Bun.Image(tiny).jpeg({ quality: 80 }).bytes()
  const exif = [...'Exif\0\0'].map(c => c.charCodeAt(0)).concat(buildTiffBlock())
  const comment = [...'private note'].map(c => c.charCodeAt(0))
  return new Uint8Array([0xFF, 0xD8, ...segment(0xE1, exif), ...segment(0xFE, comment), ...jpeg.slice(2)])
}

describe('cleanImageMetadata', () => {
  it('drops the EXIF, the GPS position, and the comment of a JPEG and keeps the format', async () => {
    const input = await taggedJpeg()
    const before = readImageMetadata(input)
    expect(before.gps).not.toBeNull()
    expect(before.tags.length).toBeGreaterThan(0)

    const out = await cleanImageMetadata(input)
    const after = readImageMetadata(out.bytes)
    expect(out.mime).toBe('image/jpeg')
    expect(after.container).toBe('jpeg')
    expect(after.tags).toEqual([])
    expect(after.gps).toBeNull()
    expect(after.blocks).toEqual([])
  })

  it('keeps a PNG as a PNG', async () => {
    const out = await cleanImageMetadata(tiny)
    expect(out.mime).toBe('image/png')
    expect(readImageMetadata(out.bytes).tags).toEqual([])
  })

  it('keeps a WebP as a WebP', async () => {
    const webp = await new Bun.Image(tiny).webp({ quality: 80 }).bytes()
    const out = await cleanImageMetadata(webp)
    expect(out.mime).toBe('image/webp')
    expect(readImageMetadata(out.bytes).tags).toEqual([])
  })
})
