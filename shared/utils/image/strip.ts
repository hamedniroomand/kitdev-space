import type { ImageContainer } from './exif'
import { detectContainer } from './exif'

export interface StripResult {
  bytes: Uint8Array
  mime: string
  /** Names of the removed blocks, such as "EXIF" or "Comment". */
  removed: string[]
}

const MIME: Partial<Record<ImageContainer, string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}

/** The chunks of a PNG that hold metadata. The color profile stays. */
const PNG_METADATA_CHUNKS: Record<string, string> = {
  tEXt: 'Text',
  zTXt: 'Text',
  iTXt: 'Text',
  eXIf: 'EXIF',
  tIME: 'Time'
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

function stripJpeg(bytes: Uint8Array): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = [bytes.subarray(0, 2)]
  const removed: string[] = []
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
      drop = matches(bytes, payload, 'Exif\0\0') ? 'EXIF' : 'XMP'
    } else if (marker === 0xED) {
      drop = 'IPTC'
    } else if (marker === 0xFE) {
      drop = 'Comment'
    } else if (marker >= 0xE2 && marker <= 0xEF) {
      // Keep the ICC color profile. Drop every other application segment.
      drop = matches(bytes, payload, 'ICC_PROFILE\0') ? null : 'Application data'
    }

    if (drop) {
      removed.push(drop)
    } else {
      parts.push(bytes.subarray(offset, end))
    }

    offset = end
  }

  if (offset < bytes.length) {
    parts.push(bytes.subarray(offset))
  }

  return { bytes: join(parts), mime: 'image/jpeg', removed: [...new Set(removed)] }
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
    } else {
      parts.push(bytes.subarray(offset, end))
    }

    offset = end

    if (name === 'IEND') {
      break
    }
  }

  return { bytes: join(parts), mime: 'image/png', removed: [...new Set(removed)] }
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
    } else {
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

  return { bytes: out, mime: 'image/webp', removed: [...new Set(removed)] }
}

/** True when the metadata can be removed with no re-encode of the pixels. */
export function canStripInPlace(container: ImageContainer): boolean {
  return container === 'jpeg' || container === 'png' || container === 'webp'
}

/**
 * Removes the metadata blocks and keeps the pixel data byte for byte.
 * Returns null when the container has no in-place path.
 */
export function stripImageMetadata(bytes: Uint8Array): StripResult | null {
  const container = detectContainer(bytes)

  switch (container) {
    case 'jpeg':
      return stripJpeg(bytes)
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
