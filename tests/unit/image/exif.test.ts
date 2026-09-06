import { describe, expect, it } from 'vitest'
import { detectContainer, readImageMetadata } from '#shared/utils/image/exif'
import { buildJpeg, buildPng, buildWebp } from './fixtures'

function tag(bytes: Uint8Array, name: string) {
  return readImageMetadata(bytes).tags.find(item => item.name === name)
}

describe('detectContainer', () => {
  it('names each container', () => {
    expect(detectContainer(buildJpeg())).toBe('jpeg')
    expect(detectContainer(buildPng())).toBe('png')
    expect(detectContainer(buildWebp())).toBe('webp')
    expect(detectContainer(new Uint8Array([1, 2, 3]))).toBe('unknown')
  })
})

describe('readImageMetadata with a JPEG', () => {
  const bytes = buildJpeg()
  const result = readImageMetadata(bytes)

  it('reads the frame size', () => {
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
  })

  it('reads the camera tags', () => {
    expect(tag(bytes, 'Make')?.value).toBe('TestCam')
    expect(tag(bytes, 'Model')?.value).toBe('Model X')
    expect(tag(bytes, 'ISO')?.value).toBe('400')
  })

  it('shows the readable name of an enumerated value', () => {
    expect(tag(bytes, 'Orientation')?.value).toBe('Rotate 90°')
  })

  it('shows a shutter speed as a fraction', () => {
    expect(tag(bytes, 'ExposureTime')?.value).toBe('1/125')
  })

  it('reads the GPS position', () => {
    expect(result.gps?.latitude).toBeCloseTo(48.8584, 3)
    expect(result.gps?.longitude).toBeCloseTo(2.2945, 3)
  })

  it('marks the private tags', () => {
    expect(tag(bytes, 'Make')?.private).toBe(true)
    expect(tag(bytes, 'ISO')?.private).toBe(false)
  })

  it('lists the metadata blocks', () => {
    expect(result.blocks).toContain('EXIF')
    expect(result.blocks).toContain('Comment')
  })
})

describe('readImageMetadata with a PNG', () => {
  const bytes = buildPng()
  const result = readImageMetadata(bytes)

  it('reads the size from the IHDR', () => {
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
  })

  it('reads the eXIf chunk and the text chunk', () => {
    expect(result.gps?.latitude).toBeCloseTo(48.8584, 3)
    expect(tag(bytes, 'Author')?.value).toBe('Jane')
  })
})

describe('readImageMetadata with a WebP', () => {
  const bytes = buildWebp()
  const result = readImageMetadata(bytes)

  it('reads the canvas size from the VP8X', () => {
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
  })

  it('reads the EXIF chunk and finds the XMP packet', () => {
    expect(result.gps?.longitude).toBeCloseTo(2.2945, 3)
    expect(result.blocks).toContain('XMP')
  })
})

describe('readImageMetadata with a bad file', () => {
  it('returns an empty result and does not throw', () => {
    const result = readImageMetadata(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, 0xFF, 0xFF, 0x01]))
    expect(result.container).toBe('jpeg')
    expect(result.tags).toEqual([])
    expect(result.gps).toBeNull()
  })
})
