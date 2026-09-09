import type { ImageContainer } from './exif'
import { detectContainer, readTiffOrientation, tiffValueSize } from './exif'

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
   * "all" removes every EXIF tag. "gps" removes the GPS block only and keeps
   * the camera settings. Default: "all".
   */
  exif?: 'all' | 'gps'
  /** Remove the XMP packet. Default: true. */
  xmp?: boolean
  /** Remove the IPTC block. Default: true. */
  iptc?: boolean
  /** Remove the comment and the text blocks. Default: true. */
  comments?: boolean
  /**
   * Keep the Orientation tag of a JPEG in a small EXIF block. A viewer needs
   * that tag to show the image in the correct rotation.
   * ponytail: JPEG only. A PNG eXIf chunk and a WebP EXIF chunk almost never
   * hold an orientation tag, so they lose it with the rest of the block.
   */
  keepOrientation?: boolean
}

interface StripPlan {
  exif: 'all' | 'gps'
  xmp: boolean
  iptc: boolean
  comments: boolean
  keepOrientation: boolean
}

function plan(options: StripOptions): StripPlan {
  return {
    exif: options.exif ?? 'all',
    xmp: options.xmp ?? true,
    iptc: options.iptc ?? true,
    comments: options.comments ?? true,
    keepOrientation: options.keepOrientation ?? false,
  }
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

/** Writes zero over the entry table, the values, and the next pointer of one IFD. */
function zeroIfd(block: Uint8Array, view: DataView, ifdAt: number, little: boolean) {
  if (ifdAt < 0 || ifdAt + 2 > block.length) {
    return
  }

  const count = view.getUint16(ifdAt, little)
  const end = ifdAt + 2 + count * 12
  if (end + 4 > block.length) {
    return
  }

  for (let index = 0; index < count; index += 1) {
    const at = ifdAt + 2 + index * 12
    const total = tiffValueSize(view.getUint16(at + 2, little), view.getUint32(at + 4, little))
    if (total > 4) {
      const valueAt = view.getUint32(at + 8, little)
      if (valueAt + total <= block.length) {
        block.fill(0, valueAt, valueAt + total)
      }
    }
  }

  block.fill(0, ifdAt, end + 4)
}

/**
 * Removes the GPS block of a TIFF and keeps every other tag. The block is
 * edited in place, so the value offsets of the other tags stay correct.
 * Returns true when the TIFF held a GPS block.
 */
function removeGpsIfd(block: Uint8Array): boolean {
  if (block.length < 8) {
    return false
  }

  const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
  const order = view.getUint16(0, false)
  if (order !== 0x4949 && order !== 0x4D4D) {
    return false
  }

  const little = order === 0x4949
  if (view.getUint16(2, little) !== 42) {
    return false
  }

  const ifdAt = view.getUint32(4, little)
  if (ifdAt + 2 > block.length) {
    return false
  }

  const count = view.getUint16(ifdAt, little)
  const end = ifdAt + 2 + count * 12
  if (count === 0 || end + 4 > block.length) {
    return false
  }

  let pointerAt = -1
  for (let index = 0; index < count; index += 1) {
    const at = ifdAt + 2 + index * 12
    if (view.getUint16(at, little) === 0x8825) {
      pointerAt = at
      break
    }
  }

  if (pointerAt < 0) {
    return false
  }

  zeroIfd(block, view, view.getUint32(pointerAt + 8, little), little)
  // Move the entries after the pointer left, then clear the freed slot.
  block.copyWithin(pointerAt, pointerAt + 12, end + 4)
  block.fill(0, end - 8, end + 4)
  view.setUint16(ifdAt, count - 1, little)
  return true
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

function stripJpeg(bytes: Uint8Array, options: StripPlan): StripResult {
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
    let done = false

    if (marker === 0xE1 && matches(bytes, payload, 'Exif\0\0')) {
      if (options.exif === 'gps') {
        // The segment stays. Only the GPS block inside it goes.
        const segment = bytes.slice(offset, end)
        if (removeGpsIfd(segment.subarray(10))) {
          removed.push('GPS')
        }
        kept.push('camera settings')
        parts.push(segment)
        done = true
      }
      else {
        drop = 'EXIF'
        const orientation = options.keepOrientation ? readTiffOrientation(view, payload + 6) : null
        if (orientation !== null && orientation > 1 && orientation <= 8) {
          parts.push(orientationSegment(orientation))
          kept.push('Orientation')
        }
      }
    }
    else if (marker === 0xE1) {
      drop = options.xmp ? 'XMP' : null
    }
    else if (marker === 0xED) {
      drop = options.iptc ? 'IPTC' : null
    }
    else if (marker === 0xFE) {
      drop = options.comments ? 'Comment' : null
    }
    else if (marker >= 0xE2 && marker <= 0xEF) {
      // Keep the ICC color profile and Adobe APP14 marker. Drop every other application segment.
      const isIcc = matches(bytes, payload, 'ICC_PROFILE\0')
      const isAdobeApp14 = marker === 0xEE && matches(bytes, payload, 'Adobe')
      const keep = isIcc || isAdobeApp14 || options.exif === 'gps'
      drop = keep ? null : 'Application data'
    }

    if (drop) {
      removed.push(drop)
    }
    else if (!done) {
      parts.push(bytes.subarray(offset, end))
    }

    offset = end
  }

  if (offset < bytes.length) {
    parts.push(bytes.subarray(offset))
  }

  return { bytes: join(parts), mime: 'image/jpeg', removed: [...new Set(removed)], kept }
}

const CRC_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let value = 0xFFFFFFFF
  for (const byte of bytes) {
    value = CRC_TABLE[(value ^ byte) & 0xFF]! ^ (value >>> 8)
  }
  return (value ^ 0xFFFFFFFF) >>> 0
}

function stripPng(bytes: Uint8Array, options: StripPlan): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = [bytes.subarray(0, 8)]
  const removed: string[] = []
  const kept: string[] = []
  let offset = 8

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false)
    const name = chunkName(bytes, offset + 4)
    const end = offset + 12 + length

    if (end > bytes.length) {
      break
    }

    if (name === 'eXIf' && options.exif === 'gps') {
      // The chunk stays. Only the GPS block inside it goes, so the CRC changes.
      const chunk = bytes.slice(offset, end)
      if (removeGpsIfd(chunk.subarray(8, 8 + length))) {
        removed.push('GPS')
      }
      new DataView(chunk.buffer).setUint32(8 + length, crc32(chunk.subarray(4, 8 + length)), false)
      kept.push('camera settings')
      parts.push(chunk)
    }
    else {
      const label = PNG_METADATA_CHUNKS[name]
      const drop = label && (label === 'EXIF' ? true : options.comments)
      if (drop) {
        removed.push(label)
      }
      else {
        parts.push(bytes.subarray(offset, end))
      }
    }

    offset = end

    if (name === 'IEND') {
      break
    }
  }

  return { bytes: join(parts), mime: 'image/png', removed: [...new Set(removed)], kept }
}

function stripWebp(bytes: Uint8Array, options: StripPlan): StripResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts: Uint8Array[] = []
  const removed: string[] = []
  const kept: string[] = []
  let offset = 12
  // VP8X states which blocks the file holds. Clear the bit of each block that goes.
  const clearFlags = (options.exif === 'all' ? 0x08 : 0) | (options.xmp ? 0x04 : 0)

  while (offset + 8 <= bytes.length) {
    const name = chunkName(bytes, offset)
    const length = view.getUint32(offset + 4, true)
    const end = offset + 8 + length + (length % 2)

    if (end > bytes.length) {
      parts.push(bytes.subarray(offset))
      break
    }

    if (name === 'EXIF' && options.exif === 'gps') {
      // The chunk stays. Only the GPS block inside it goes.
      const chunk = bytes.slice(offset, end)
      const start = matches(chunk, 8, 'Exif\0\0') ? 14 : 8
      if (removeGpsIfd(chunk.subarray(start, 8 + length))) {
        removed.push('GPS')
      }
      kept.push('camera settings')
      parts.push(chunk)
    }
    else if ((name === 'EXIF' && options.exif === 'all') || (name === 'XMP ' && options.xmp)) {
      removed.push(name === 'EXIF' ? 'EXIF' : 'XMP')
    }
    else {
      const chunk = bytes.slice(offset, end)
      if (name === 'VP8X' && chunk.length > 8) {
        chunk[8] = chunk[8]! & ~clearFlags
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

  return { bytes: out, mime: 'image/webp', removed: [...new Set(removed)], kept }
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
  const steps = plan(options)

  switch (container) {
    case 'jpeg':
      return stripJpeg(bytes, steps)
    case 'png':
      return stripPng(bytes, steps)
    case 'webp':
      return stripWebp(bytes, steps)
    default:
      return null
  }
}

export function mimeForContainer(container: ImageContainer): string {
  return MIME[container] ?? 'application/octet-stream'
}
