import { describe, expect, it } from 'vitest'
import { readImageMetadata } from '#shared/utils/image/exif'
import { canStripInPlace, stripImageMetadata } from '#shared/utils/image/strip'
import { buildJpeg, buildPng, buildWebp } from './fixtures'

function scanData(bytes: Uint8Array) {
  // The bytes after the start of scan marker hold the pixels.
  const at = bytes.findIndex((_, index) => bytes[index] === 0xFF && bytes[index + 1] === 0xDA)
  return bytes.subarray(at)
}

describe('canStripInPlace', () => {
  it('covers JPEG, PNG, and WebP only', () => {
    expect(canStripInPlace('jpeg')).toBe(true)
    expect(canStripInPlace('png')).toBe(true)
    expect(canStripInPlace('webp')).toBe(true)
    expect(canStripInPlace('avif')).toBe(false)
    expect(canStripInPlace('unknown')).toBe(false)
  })
})

describe('stripImageMetadata with a JPEG', () => {
  const input = buildJpeg()
  const result = stripImageMetadata(input)!

  it('removes the EXIF and the comment', () => {
    expect(result.removed).toContain('EXIF')
    expect(result.removed).toContain('Comment')
  })

  it('leaves no tag and no position', () => {
    const after = readImageMetadata(result.bytes)
    expect(after.tags).toEqual([])
    expect(after.gps).toBeNull()
    expect(after.blocks).toEqual([])
  })

  it('keeps the frame size and the pixel data byte for byte', () => {
    const after = readImageMetadata(result.bytes)
    expect(after.width).toBe(40)
    expect(after.height).toBe(30)
    expect(scanData(result.bytes)).toEqual(scanData(input))
  })

  it('makes a smaller file', () => {
    expect(result.bytes.length).toBeLessThan(input.length)
    expect(result.mime).toBe('image/jpeg')
  })
})

describe('stripImageMetadata with a PNG', () => {
  const input = buildPng()
  const result = stripImageMetadata(input)!

  it('removes the eXIf chunk and the text chunk', () => {
    expect(result.removed).toContain('EXIF')
    expect(result.removed).toContain('Text')
  })

  it('keeps the size and drops every tag', () => {
    const after = readImageMetadata(result.bytes)
    expect(after.width).toBe(40)
    expect(after.height).toBe(30)
    expect(after.tags).toEqual([])
    expect(after.gps).toBeNull()
  })

  it('keeps the IDAT chunk', () => {
    const text = String.fromCharCode(...result.bytes)
    expect(text).toContain('IDAT')
    expect(text).toContain('IEND')
    expect(text).not.toContain('eXIf')
  })
})

describe('stripImageMetadata with a WebP', () => {
  const input = buildWebp()
  const result = stripImageMetadata(input)!

  it('removes the EXIF and the XMP chunks', () => {
    expect(result.removed).toEqual(['EXIF', 'XMP'])
  })

  it('keeps the canvas size and clears the VP8X flags', () => {
    const after = readImageMetadata(result.bytes)
    expect(after.width).toBe(40)
    expect(after.height).toBe(30)
    expect(after.blocks).toEqual([])
    expect(result.bytes[20]! & 0x0C).toBe(0)
  })

  it('corrects the RIFF size', () => {
    const view = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength)
    expect(view.getUint32(4, true)).toBe(result.bytes.length - 8)
  })
})

describe('stripImageMetadata with another container', () => {
  it('returns null', () => {
    expect(stripImageMetadata(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull()
  })
})
