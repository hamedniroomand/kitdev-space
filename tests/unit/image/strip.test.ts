import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readImageMetadata } from '#shared/utils/image/exif'
import { canStripInPlace, stripImageMetadata } from '#shared/utils/image/strip'
import { buildCmykJpeg, buildJpeg, buildPng, buildWebp, crc32 } from './fixtures'

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

  it('preserves APP14 Adobe marker', () => {
    const adobeMarker = new Uint8Array([
      0xFF,
      0xD8, // SOI
      0xFF,
      0xEE,
      0x00,
      0x0E, // APP14 length 14
      0x41,
      0x64,
      0x6F,
      0x62,
      0x65, // "Adobe"
      0x00,
      0x64,
      0x00,
      0x00,
      0x00,
      0x02, // CMYK transform flag
      0xFF,
      0xDA,
      0x00,
      0x02, // SOS
      0x12,
      0x34, // scan
      0xFF,
      0xD9, // EOI
    ])
    const stripped = stripImageMetadata(adobeMarker)
    expect(stripped).not.toBeNull()
    const hasApp14 = stripped!.bytes.some((b, i) => b === 0xFF && stripped!.bytes[i + 1] === 0xEE)
    expect(hasApp14).toBe(true)
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

describe('stripImageMetadata with keepOrientation', () => {
  const input = new Uint8Array(readFileSync('tests/fixtures/images/orientation-6.jpg'))

  it('keeps the rotation of an orientation-6 JPEG', () => {
    const before = readImageMetadata(input)
    const result = stripImageMetadata(input, { keepOrientation: true })!
    const after = readImageMetadata(result.bytes)

    expect(before.tags.find(item => item.name === 'Orientation')?.value).toBe('Rotate 90°')
    expect(after.tags.find(item => item.name === 'Orientation')?.value).toBe('Rotate 90°')
    expect(result.kept).toContain('Orientation')
  })

  it('keeps the frame size and does not recompress the pixels', () => {
    const result = stripImageMetadata(input, { keepOrientation: true })!
    const after = readImageMetadata(result.bytes)

    expect(after.width).toBe(100)
    expect(after.height).toBe(50)
    expect(scanData(result.bytes)).toEqual(scanData(input))
  })

  it('removes every other tag', () => {
    const result = stripImageMetadata(input, { keepOrientation: true })!
    const after = readImageMetadata(result.bytes)

    expect(after.tags).toHaveLength(1)
    expect(after.gps).toBeNull()
  })

  it('drops the orientation when the option is off', () => {
    const after = readImageMetadata(stripImageMetadata(input)!.bytes)
    expect(after.tags).toEqual([])
  })
})

describe('stripImageMetadata with a CMYK JPEG', () => {
  const input = buildCmykJpeg()
  const result = stripImageMetadata(input, { keepOrientation: true })!

  it('keeps the ICC color profile', () => {
    expect(readImageMetadata(input).colorProfile).toBe('ICC profile')
    expect(readImageMetadata(result.bytes).colorProfile).toBe('ICC profile')
  })

  it('keeps the Adobe APP14 color transform', () => {
    const hasApp14 = result.bytes.some((byte, index) => byte === 0xFF && result.bytes[index + 1] === 0xEE)
    expect(hasApp14).toBe(true)
  })

  it('removes the EXIF and keeps the pixels byte for byte', () => {
    const after = readImageMetadata(result.bytes)
    expect(result.removed).toContain('EXIF')
    expect(after.gps).toBeNull()
    expect(after.width).toBe(40)
    expect(after.height).toBe(30)
    expect(scanData(result.bytes)).toEqual(scanData(input))
  })
})

describe('stripImageMetadata with the GPS option', () => {
  it('removes the GPS block of a JPEG and keeps the camera settings', () => {
    const result = stripImageMetadata(buildJpeg(), { exif: 'gps' })!
    const after = readImageMetadata(result.bytes)

    expect(result.removed).toContain('GPS')
    expect(after.gps).toBeNull()
    expect(after.blocks).toContain('EXIF')
    expect(after.tags.find(item => item.name === 'Make')?.value).toBe('TestCam')
    expect(after.tags.find(item => item.name === 'Model')?.value).toBe('Model X')
    expect(after.tags.find(item => item.name === 'ISO')?.value).toBe('400')
    expect(after.tags.some(item => item.group === 'GPS')).toBe(false)
  })

  it('removes the GPS block of a PNG and writes a valid chunk CRC', () => {
    const result = stripImageMetadata(buildPng(), { exif: 'gps' })!
    const after = readImageMetadata(result.bytes)

    expect(after.gps).toBeNull()
    expect(after.blocks).toContain('EXIF')
    expect(after.tags.find(item => item.name === 'Make')?.value).toBe('TestCam')

    // A decoder rejects a chunk with a wrong CRC, so check the stored value.
    const view = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength)
    let offset = 8
    let checked = false

    while (offset + 8 <= result.bytes.length) {
      const length = view.getUint32(offset, false)
      const name = String.fromCharCode(...result.bytes.subarray(offset + 4, offset + 8))
      if (name === 'eXIf') {
        const body = [...result.bytes.subarray(offset + 4, offset + 8 + length)]
        expect(view.getUint32(offset + 8 + length, false)).toBe(crc32(body))
        checked = true
      }
      offset += 12 + length
    }

    expect(checked).toBe(true)
  })

  it('removes the GPS block of a WebP and keeps the EXIF chunk', () => {
    const result = stripImageMetadata(buildWebp(), { exif: 'gps' })!
    const after = readImageMetadata(result.bytes)

    expect(after.gps).toBeNull()
    expect(after.blocks).toEqual(['EXIF'])
    expect(after.tags.find(item => item.name === 'Make')?.value).toBe('TestCam')
    expect(result.removed).toContain('XMP')
  })
})

describe('stripImageMetadata with the block options off', () => {
  it('keeps the comment of a JPEG', () => {
    const result = stripImageMetadata(buildJpeg(), { comments: false })!
    const after = readImageMetadata(result.bytes)

    expect(after.tags.find(item => item.name === 'Comment')?.value).toBe('private note')
    expect(result.removed).toContain('EXIF')
  })

  it('keeps the XMP packet of a WebP', () => {
    const result = stripImageMetadata(buildWebp(), { xmp: false })!
    const after = readImageMetadata(result.bytes)

    expect(after.blocks).toEqual(['XMP'])
    expect(result.removed).toEqual(['EXIF'])
  })

  it('keeps the text chunk of a PNG', () => {
    const result = stripImageMetadata(buildPng(), { comments: false })!
    const after = readImageMetadata(result.bytes)

    expect(after.tags.find(item => item.name === 'Author')?.value).toBe('Jane')
    expect(result.removed).toEqual(['EXIF'])
  })
})

describe('stripImageMetadata with another container', () => {
  it('returns null', () => {
    expect(stripImageMetadata(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull()
  })
})
