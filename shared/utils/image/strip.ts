import type { ImageContainer } from './exif'
import { detectContainer, readTiffOrientation } from './exif'

export interface StripResult {
  bytes: Uint8Array
  mime: string
  /** Names of the removed blocks, such as "EXIF" or "Comment". */
  removed: string[]
  /** Names of the blocks that the strip kept on purpose, such as "Orientation". */
  kept: string[]
}

export interface StripOptions {
  /**
   * Keep the Orientation tag of a JPEG in a small EXIF block. A viewer needs
   * that tag to show the image in the correct rotation.
   * ponytail: JPEG only. A PNG eXIf chunk needs a CRC, and a WebP EXIF chunk
   * needs the VP8X flag. Both formats almost never hold an orientation tag.
   */
  keepOrientation?: boolean
}

const MIME: Partial<Record<ImageContainer, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** The chunks of a PNG that hold metadata. The color profile stays. */
const PNG_METADATA_CHUNKS: Record<string, string> = {
  tEXt: 'Text',
  zTXt: 'Text',
  iTXt: 'Text',
  eXIf: 'EXIF',
  tIME: 'Time',
}

function chunkName(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!)
}

function matches(bytes: Uint8Array, offset: number, marker: string): boolean {
  if (offset + marker.length > bytes.length) {
    return false
  }
  for (let index = 0; index < marker.length; index += 1) {
    if (bytes[offset + index] !== marker.charCodeAt(index)) {
      return false
    }
  }
  return true
}

function join(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/** Builds an APP1 segment that holds one EXIF Orientation tag and nothing else. */
function orientationSegment(orientation: number): Uint8Array {
  // Exif\0\0, then a big-endian TIFF with one IFD0 entry.
  const payload = new Uint8Array(32)
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0])
  const tiff = new DataView(payload.buffer, 6)
  tiff.setUint16(0, 0x4D4D)
  tiff.setUint16(2, 42)
  tiff.setUint32(4, 8)
  tiff.setUint16(8, 1)
  tiff.setUint16(10, 0x0112)
  tiff.setUint16(12, 3)
  tiff.setUint32(14, 1)
  tiff.setUint16(18, orientation)
  tiff.setUint32(22, 0)

  const out = new Uint8Array(4 + payload.length)
  out.set([0xFF, 0xE1], 0)
  new DataView(out.buffer).setUint16(2, payload.length + 2)
  out.set(payload, 4)
  return out
}

function stripJpeg(bytes: Uint8Array, options: StripOptions): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = [bytes.subarray(0, 2)]
  const removed: string[] = []
  const kept: string[] = []
  let offset = 2

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xFF) {
      break
    }

    const marker = bytes[offset + 1]!

    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      parts.push(bytes.subarray(offset, offset + 2))
      offset += 2
      continue
    }

    if (marker === 0xDA) {
      // Start of scan. Copy the pixel data with no change.
      parts.push(bytes.subarray(offset))
      offset = bytes.length
      break
    }

    const length = view.getUint16(offset + 2, false)
    const end = offset + 2 + length

    if (length < 2 || end > bytes.length) {
      parts.push(bytes.subarray(offset))
      offset = bytes.length
      break
    }

    const payload = offset + 4
    let drop: string | null = null

    if (marker === 0xE1) {
      const isExif = matches(bytes, payload, 'Exif\0\0')
      drop = isExif ? 'EXIF' : 'XMP'

      if (isExif && options.keepOrientation) {
        const orientation = readTiffOrientation(view, payload + 6)
        if (orientation !== null && orientation > 1 && orientation <= 8) {
          parts.push(orientationSegment(orientation))
          kept.push('Orientation')
        }
      }
    }
    else if (marker === 0xED) {
      drop = 'IPTC'
    }
    else if (marker === 0xFE) {
      drop = 'Comment'
    }
    else if (marker >= 0xE2 && marker <= 0xEF) {
      // Keep the ICC color profile and Adobe APP14 marker. Drop every other application segment.
      const isIcc = matches(bytes, payload, 'ICC_PROFILE\0')
      const isAdobeApp14 = marker === 0xEE && matches(bytes, payload, 'Adobe')
      drop = isIcc || isAdobeApp14 ? null : 'Application data'
    }

    if (drop) {
      removed.push(drop)
    }
    else {
      parts.push(bytes.subarray(offset, end))
    }

    offset = end
  }

  if (offset < bytes.length) {
    parts.push(bytes.subarray(offset))
  }

  return { bytes: join(parts), mime: 'image/jpeg', removed: [...new Set(removed)], kept }
}

function stripPng(bytes: Uint8Array): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = [bytes.subarray(0, 8)]
  const removed: string[] = []
  let offset = 8

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false)
    const name = chunkName(bytes, offset + 4)
    const end = offset + 12 + length

    if (end > bytes.length) {
      break
    }

    const drop = PNG_METADATA_CHUNKS[name]
    if (drop) {
      removed.push(drop)
    }
    else {
      parts.push(bytes.subarray(offset, end))
    }

    offset = end

    if (name === 'IEND') {
      break
    }
  }

  return { bytes: join(parts), mime: 'image/png', removed: [...new Set(removed)], kept: [] }
}

function stripWebp(bytes: Uint8Array): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = []
  const removed: string[] = []
  let offset = 12

  while (offset + 8 <= bytes.length) {
    const name = chunkName(bytes, offset)
    const length = view.getUint32(offset + 4, true)
    const end = offset + 8 + length + (length % 2)

    if (end > bytes.length) {
      parts.push(bytes.subarray(offset))
      break
    }

    if (name === 'EXIF' || name === 'XMP ') {
      removed.push(name === 'EXIF' ? 'EXIF' : 'XMP')
    }
    else {
      const chunk = bytes.slice(offset, end)
      // VP8X states which blocks the file holds. Clear the EXIF and the XMP bits.
      if (name === 'VP8X' && chunk.length > 8) {
        chunk[8] = chunk[8]! & ~0x0C
      }
      parts.push(chunk)
    }

    offset = end
  }

  const body = join(parts)
  const out = new Uint8Array(12 + body.length)
  out.set(bytes.subarray(0, 12), 0)
  out.set(body, 12)
  // The RIFF size counts every byte after the size field.
  new DataView(out.buffer).setUint32(4, out.length - 8, true)

  return { bytes: out, mime: 'image/webp', removed: [...new Set(removed)], kept: [] }
}

/** True when the metadata can be removed with no re-encode of the pixels. */
export function canStripInPlace(container: ImageContainer): boolean {
  return container === 'jpeg' || container === 'png' || container === 'webp'
}

/**
 * Removes the metadata blocks and keeps the pixel data byte for byte.
 * Returns null when the container has no in-place path.
 */
export function stripImageMetadata(bytes: Uint8Array, options: StripOptions = {}): StripResult | null {
  const container = detectContainer(bytes)

  switch (container) {
    case 'jpeg':
      return stripJpeg(bytes, options)
    case 'png':
      return stripPng(bytes)
    case 'webp':
      return stripWebp(bytes)
    default:
      return null
  }
}

export function mimeForContainer(container: ImageContainer): string {
  return MIME[container] ?? 'application/octet-stream'
}
