import { enumLabel, GPS_TAG_NAMES, isPrivateTag, TIFF_TAG_NAMES } from './exif-tags'

export type MetadataGroup = 'Image' | 'EXIF' | 'GPS' | 'Text' | 'XMP'

export interface MetadataTag {
  group: MetadataGroup
  name: string
  value: string
  /** True when the tag can identify the camera, the owner, or the place. */
  private: boolean
}

export interface GpsPosition {
  latitude: number
  longitude: number
}

export type ImageContainer = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'tiff' | 'unknown'

export interface ImageMetadata {
  container: ImageContainer
  width: number | null
  height: number | null
  bytes: number
  tags: MetadataTag[]
  gps: GpsPosition | null
  /** Names of the blocks that hold the metadata, such as "EXIF" or "XMP". */
  blocks: string[]
  /** The color profile that the file holds, such as "ICC profile". Null when it holds none. */
  colorProfile: string | null
}

// A malformed file must not make the parser read a large range.
const MAX_TAG_COUNT = 512
const MAX_VALUE_COUNT = 4096

const TYPE_SIZES: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
}

/** The byte count of a TIFF entry value. Zero when the type is not known. */
export function tiffValueSize(type: number, count: number): number {
  return (TYPE_SIZES[type] ?? 0) * count
}

function ascii(view: DataView, offset: number, length: number): string {
  let out = ''
  for (let index = 0; index < length; index += 1) {
    const code = view.getUint8(offset + index)
    if (code === 0) {
      break
    }
    out += String.fromCharCode(code)
  }
  return out.trim()
}

/** Reads a four character container code. Trailing spaces are significant. */
function fourCC(view: DataView, offset: number): string {
  if (offset + 4 > view.byteLength) {
    return ''
  }
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function startsWith(view: DataView, offset: number, marker: string): boolean {
  if (offset + marker.length > view.byteLength) {
    return false
  }
  for (let index = 0; index < marker.length; index += 1) {
    if (view.getUint8(offset + index) !== marker.charCodeAt(index)) {
      return false
    }
  }
  return true
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(Number(value.toFixed(4)))
}

function formatRational(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return '0'
  }
  const value = numerator / denominator
  // A shutter speed reads better as a fraction.
  if (value > 0 && value < 1 && numerator === 1) {
    return `${numerator}/${denominator}`
  }
  return formatNumber(value)
}

interface RawTag {
  tag: number
  values: (number | string)[]
  text: string
}

function readEntryValues(
  view: DataView,
  tiffStart: number,
  entryOffset: number,
  little: boolean,
): RawTag | null {
  const tag = view.getUint16(entryOffset, little)
  const type = view.getUint16(entryOffset + 2, little)
  const count = view.getUint32(entryOffset + 4, little)
  const unit = TYPE_SIZES[type]

  if (!unit || count === 0 || count > MAX_VALUE_COUNT) {
    return null
  }

  const total = unit * count
  const inline = total <= 4
  const valueOffset = inline
    ? entryOffset + 8
    : tiffStart + view.getUint32(entryOffset + 8, little)

  if (valueOffset < 0 || valueOffset + total > view.byteLength) {
    return null
  }

  if (type === 2) {
    const text = ascii(view, valueOffset, count)
    return { tag, values: [text], text }
  }

  if (type === 7) {
    // UNDEFINED. Show the byte count, not the bytes.
    return { tag, values: [], text: `${count} bytes` }
  }

  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const at = valueOffset + index * unit
    switch (type) {
      case 1:
        values.push(view.getUint8(at))
        break
      case 6:
        values.push(view.getInt8(at))
        break
      case 3:
        values.push(view.getUint16(at, little))
        break
      case 8:
        values.push(view.getInt16(at, little))
        break
      case 4:
        values.push(view.getUint32(at, little))
        break
      case 9:
        values.push(view.getInt32(at, little))
        break
      case 5:
        values.push(view.getUint32(at, little) / (view.getUint32(at + 4, little) || 1))
        break
      case 10:
        values.push(view.getInt32(at, little) / (view.getInt32(at + 4, little) || 1))
        break
      case 11:
        values.push(view.getFloat32(at, little))
        break
      case 12:
        values.push(view.getFloat64(at, little))
        break
    }
  }

  let text: string
  if (type === 5 || type === 10) {
    text = values
      .map((_, index) => {
        const at = valueOffset + index * unit
        const numerator = type === 5 ? view.getUint32(at, little) : view.getInt32(at, little)
        const denominator = type === 5 ? view.getUint32(at + 4, little) : view.getInt32(at + 4, little)
        return formatRational(numerator, denominator)
      })
      .join(', ')
  }
  else {
    text = values.map(formatNumber).join(', ')
  }

  return { tag, values, text }
}

function readIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  little: boolean,
): { entries: RawTag[], subIfds: Record<number, number>, next: number } {
  const entries: RawTag[] = []
  const subIfds: Record<number, number> = {}

  if (ifdOffset < 0 || ifdOffset + 2 > view.byteLength) {
    return { entries, subIfds, next: 0 }
  }

  const count = Math.min(view.getUint16(ifdOffset, little), MAX_TAG_COUNT)
  const end = ifdOffset + 2 + count * 12

  if (end + 4 > view.byteLength) {
    return { entries, subIfds, next: 0 }
  }

  for (let index = 0; index < count; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12
    const tag = view.getUint16(entryOffset, little)

    // Pointers to the EXIF, the GPS, and the interoperability blocks.
    if (tag === 0x8769 || tag === 0x8825 || tag === 0xA005) {
      subIfds[tag] = tiffStart + view.getUint32(entryOffset + 8, little)
      continue
    }

    const entry = readEntryValues(view, tiffStart, entryOffset, little)
    if (entry) {
      entries.push(entry)
    }
  }

  return { entries, subIfds, next: view.getUint32(end, little) }
}

function toDegrees(parts: (number | string)[], ref: string): number | null {
  const [degrees, minutes, seconds] = parts as number[]
  if (typeof degrees !== 'number' || typeof minutes !== 'number') {
    return null
  }

  const value = degrees + minutes / 60 + (seconds ?? 0) / 3600
  const sign = ref === 'S' || ref === 'W' ? -1 : 1
  return Number((value * sign).toFixed(6))
}

/**
 * Parses a TIFF block. A JPEG APP1 segment, a PNG eXIf chunk, and a WebP EXIF
 * chunk all hold the same structure.
 */
export function parseTiffBlock(
  view: DataView,
  tiffStart: number,
): { tags: MetadataTag[], gps: GpsPosition | null } {
  const tags: MetadataTag[] = []

  if (tiffStart + 8 > view.byteLength) {
    return { tags, gps: null }
  }

  const order = view.getUint16(tiffStart, false)
  if (order !== 0x4949 && order !== 0x4D4D) {
    return { tags, gps: null }
  }

  const little = order === 0x4949
  if (view.getUint16(tiffStart + 2, little) !== 42) {
    return { tags, gps: null }
  }

  function push(group: MetadataGroup, names: Record<number, string>, entries: RawTag[]) {
    for (const entry of entries) {
      const name = names[entry.tag] ?? `Tag 0x${entry.tag.toString(16).toUpperCase()}`
      const single = entry.values.length === 1 ? entry.values[0] : null
      const label = typeof single === 'number' ? enumLabel(name, single) : null

      tags.push({
        group,
        name,
        value: label ?? entry.text,
        private: isPrivateTag(name),
      })
    }
  }

  const ifd0 = readIfd(view, tiffStart, tiffStart + view.getUint32(tiffStart + 4, little), little)
  push('Image', TIFF_TAG_NAMES, ifd0.entries)

  const exifOffset = ifd0.subIfds[0x8769]
  if (exifOffset !== undefined) {
    push('EXIF', TIFF_TAG_NAMES, readIfd(view, tiffStart, exifOffset, little).entries)
  }

  let gps: GpsPosition | null = null
  const gpsOffset = ifd0.subIfds[0x8825]
  if (gpsOffset !== undefined) {
    const block = readIfd(view, tiffStart, gpsOffset, little)
    push('GPS', GPS_TAG_NAMES, block.entries)

    const byTag = new Map(block.entries.map(entry => [entry.tag, entry]))
    const latitude = byTag.get(0x0002)
    const longitude = byTag.get(0x0004)

    if (latitude && longitude) {
      const lat = toDegrees(latitude.values, byTag.get(0x0001)?.text ?? 'N')
      const lon = toDegrees(longitude.values, byTag.get(0x0003)?.text ?? 'E')
      if (lat !== null && lon !== null) {
        gps = { latitude: lat, longitude: lon }
      }
    }
  }

  return { tags, gps }
}

/**
 * Reads the Orientation tag of a TIFF block. A strip that keeps this tag keeps
 * the rotation that a viewer applies to the pixels.
 */
export function readTiffOrientation(view: DataView, tiffStart: number): number | null {
  if (tiffStart + 8 > view.byteLength) {
    return null
  }

  const order = view.getUint16(tiffStart, false)
  if (order !== 0x4949 && order !== 0x4D4D) {
    return null
  }

  const little = order === 0x4949
  if (view.getUint16(tiffStart + 2, little) !== 42) {
    return null
  }

  const ifd0 = readIfd(view, tiffStart, tiffStart + view.getUint32(tiffStart + 4, little), little)
  const entry = ifd0.entries.find(item => item.tag === 0x0112)
  const value = entry?.values[0]
  return typeof value === 'number' ? value : null
}

export function detectContainer(bytes: Uint8Array): ImageContainer {
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpeg'
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'png'
  }
  if (bytes.length >= 12) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (startsWith(view, 0, 'RIFF') && startsWith(view, 8, 'WEBP')) {
      return 'webp'
    }
    if (startsWith(view, 4, 'ftyp')) {
      const brand = fourCC(view, 8)
      if (brand === 'avif' || brand === 'avis') {
        return 'avif'
      }
    }
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'gif'
  }
  if (bytes.length >= 8) {
    const little = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00
    const big = bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A
    if (little || big) {
      return 'tiff'
    }
  }
  return 'unknown'
}

function readJpeg(view: DataView, result: ImageMetadata) {
  let offset = 2

  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) {
      break
    }

    const marker = view.getUint8(offset + 1)

    // Standalone markers carry no length.
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2
      continue
    }

    // Start of scan. The entropy data follows, so stop.
    if (marker === 0xDA || marker === 0xD9) {
      break
    }

    const length = view.getUint16(offset + 2, false)
    const payload = offset + 4
    const payloadLength = length - 2

    if (length < 2 || payload + payloadLength > view.byteLength) {
      break
    }

    // Start of frame. Every SOF except SOF4, SOF8, and SOF12 holds the size.
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      result.height = view.getUint16(payload + 1, false)
      result.width = view.getUint16(payload + 3, false)
    }
    else if (marker === 0xE1 && startsWith(view, payload, 'Exif\0\0')) {
      result.blocks.push('EXIF')
      const block = parseTiffBlock(view, payload + 6)
      result.tags.push(...block.tags)
      result.gps = result.gps ?? block.gps
    }
    else if (marker === 0xE1 && startsWith(view, payload, 'http://ns.adobe.com/xap/1.0/')) {
      result.blocks.push('XMP')
      result.tags.push({ group: 'XMP', name: 'XMP packet', value: `${payloadLength} bytes`, private: true })
    }
    else if (marker === 0xED) {
      result.blocks.push('IPTC')
      result.tags.push({ group: 'Text', name: 'Photoshop IRB', value: `${payloadLength} bytes`, private: true })
    }
    else if (marker === 0xFE) {
      result.blocks.push('Comment')
      result.tags.push({ group: 'Text', name: 'Comment', value: ascii(view, payload, payloadLength), private: true })
    }
    else if (marker === 0xE2 && startsWith(view, payload, 'ICC_PROFILE\0')) {
      result.colorProfile = 'ICC profile'
    }

    offset = payload + payloadLength
  }
}

function readPng(view: DataView, bytes: Uint8Array, result: ImageMetadata) {
  let offset = 8

  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset, false)
    const type = fourCC(view, offset + 4)
    const payload = offset + 8

    if (payload + length > view.byteLength) {
      break
    }

    if (type === 'IHDR') {
      result.width = view.getUint32(payload, false)
      result.height = view.getUint32(payload + 4, false)
    }
    else if (type === 'eXIf') {
      result.blocks.push('EXIF')
      const block = parseTiffBlock(view, payload)
      result.tags.push(...block.tags)
      result.gps = result.gps ?? block.gps
    }
    else if (type === 'tEXt' || type === 'iTXt') {
      result.blocks.push('Text')
      const separator = bytes.indexOf(0, payload)
      const key = separator > payload ? ascii(view, payload, separator - payload) : type
      const start = type === 'tEXt' ? separator + 1 : payload + length
      const value = type === 'tEXt' ? ascii(view, start, payload + length - start) : `${length} bytes`
      result.tags.push({ group: 'Text', name: key, value, private: true })
    }
    else if (type === 'zTXt') {
      result.blocks.push('Text')
      const separator = bytes.indexOf(0, payload)
      const key = separator > payload ? ascii(view, payload, separator - payload) : 'zTXt'
      result.tags.push({ group: 'Text', name: key, value: 'compressed text', private: true })
    }
    else if (type === 'tIME') {
      result.blocks.push('Time')
      const year = view.getUint16(payload, false)
      const pad = (value: number) => String(value).padStart(2, '0')
      result.tags.push({
        group: 'Text',
        name: 'ModifyDate',
        value: `${year}-${pad(view.getUint8(payload + 2))}-${pad(view.getUint8(payload + 3))} `
          + `${pad(view.getUint8(payload + 4))}:${pad(view.getUint8(payload + 5))}:${pad(view.getUint8(payload + 6))}`,
        private: true,
      })
    }
    else if (type === 'iCCP') {
      result.colorProfile = 'ICC profile'
    }
    else if (type === 'sRGB') {
      result.colorProfile = result.colorProfile ?? 'sRGB'
    }
    else if (type === 'IDAT' || type === 'IEND') {
      break
    }

    offset = payload + length + 4
  }
}

function readWebp(view: DataView, result: ImageMetadata) {
  let offset = 12

  while (offset + 8 <= view.byteLength) {
    const type = fourCC(view, offset)
    const length = view.getUint32(offset + 4, true)
    const payload = offset + 8

    if (payload + length > view.byteLength) {
      break
    }

    if (type === 'VP8X') {
      result.width = 1 + (view.getUint8(payload + 4) | (view.getUint8(payload + 5) << 8) | (view.getUint8(payload + 6) << 16))
      result.height = 1 + (view.getUint8(payload + 7) | (view.getUint8(payload + 8) << 8) | (view.getUint8(payload + 9) << 16))
    }
    else if (type === 'EXIF') {
      result.blocks.push('EXIF')
      // Some encoders put the Exif\0\0 marker before the TIFF header.
      const start = startsWith(view, payload, 'Exif\0\0') ? payload + 6 : payload
      const block = parseTiffBlock(view, start)
      result.tags.push(...block.tags)
      result.gps = result.gps ?? block.gps
    }
    else if (type === 'XMP ') {
      result.blocks.push('XMP')
      result.tags.push({ group: 'XMP', name: 'XMP packet', value: `${length} bytes`, private: true })
    }
    else if (type === 'ICCP') {
      result.colorProfile = 'ICC profile'
    }

    // Each RIFF chunk has even padding.
    offset = payload + length + (length % 2)
  }
}

/** A TIFF file is one TIFF block. The header sits at offset 0. */
function readTiff(view: DataView, result: ImageMetadata) {
  const block = parseTiffBlock(view, 0)
  if (block.tags.length === 0) {
    return
  }

  result.blocks.push('EXIF')
  result.tags.push(...block.tags)
  result.gps = block.gps

  const size = (name: string) => {
    const value = Number(block.tags.find(item => item.name === name)?.value)
    return Number.isFinite(value) ? value : null
  }
  result.width = size('ImageWidth')
  result.height = size('ImageHeight')
}

/** Reads a big-endian integer of one to eight bytes. */
function intAt(view: DataView, offset: number, size: number): number {
  let value = 0
  for (let index = 0; index < size; index += 1) {
    value = value * 256 + view.getUint8(offset + index)
  }
  return value
}

/**
 * Walks the boxes of an ISO base media file. AVIF, HEIC, and MP4 share this
 * structure. The visitor gets the start and the end of each box payload.
 */
function walkBoxes(
  view: DataView,
  start: number,
  end: number,
  visit: (type: string, payload: number, payloadEnd: number) => void,
) {
  let offset = start

  while (offset + 8 <= end) {
    let size = view.getUint32(offset, false)
    let payload = offset + 8

    if (size === 1) {
      if (offset + 16 > end) {
        return
      }
      // A 64-bit size. A metadata box never needs the high word.
      size = intAt(view, offset + 8, 8)
      payload = offset + 16
    }
    else if (size === 0) {
      size = end - offset
    }

    const boxEnd = offset + size
    if (size < 8 || boxEnd > end || payload > boxEnd) {
      return
    }

    visit(fourCC(view, offset + 4), payload, boxEnd)
    offset = boxEnd
  }
}

/** The place of one item inside the file, from the iloc box. */
interface ItemExtent {
  offset: number
  length: number
}

function readItemInfo(view: DataView, payload: number, end: number): Map<number, string> {
  const types = new Map<number, string>()
  const version = view.getUint8(payload)
  // Version 0 counts the entries in two bytes. Every later version uses four.
  const listAt = payload + 4 + (version === 0 ? 2 : 4)

  walkBoxes(view, listAt, end, (type, itemPayload) => {
    if (type !== 'infe') {
      return
    }
    const itemVersion = view.getUint8(itemPayload)
    const idSize = itemVersion >= 3 ? 4 : 2
    const id = intAt(view, itemPayload + 4, idSize)
    types.set(id, fourCC(view, itemPayload + 4 + idSize + 2))
  })

  return types
}

function readItemLocations(view: DataView, payload: number): Map<number, ItemExtent> {
  const places = new Map<number, ItemExtent>()
  const version = view.getUint8(payload)
  const sizes = view.getUint8(payload + 4)
  const bases = view.getUint8(payload + 5)
  const offsetSize = sizes >> 4
  const lengthSize = sizes & 0x0F
  const baseSize = bases >> 4
  const indexSize = version === 1 || version === 2 ? bases & 0x0F : 0
  const idSize = version === 2 ? 4 : 2

  let at = payload + 6 + (version === 2 ? 4 : 2)
  const count = version === 2 ? view.getUint32(payload + 6, false) : view.getUint16(payload + 6, false)

  for (let index = 0; index < count; index += 1) {
    if (at + idSize + 4 > view.byteLength) {
      break
    }
    const id = intAt(view, at, idSize)
    at += idSize + (version === 1 || version === 2 ? 2 : 0) + 2
    const base = intAt(view, at, baseSize)
    at += baseSize
    const extents = view.getUint16(at, false)
    at += 2

    for (let extent = 0; extent < extents; extent += 1) {
      at += indexSize
      const offset = intAt(view, at, offsetSize)
      const length = intAt(view, at + offsetSize, lengthSize)
      at += offsetSize + lengthSize
      if (extent === 0) {
        places.set(id, { offset: base + offset, length })
      }
    }
  }

  return places
}

/**
 * Reads the meta box of an AVIF file. The EXIF item holds a TIFF block after a
 * four byte offset field.
 */
function readAvif(view: DataView, result: ImageMetadata) {
  let types = new Map<number, string>()
  let places = new Map<number, ItemExtent>()

  walkBoxes(view, 0, view.byteLength, (topType, topPayload, topEnd) => {
    if (topType !== 'meta') {
      return
    }

    walkBoxes(view, topPayload + 4, topEnd, (type, payload, payloadEnd) => {
      if (type === 'iinf') {
        types = readItemInfo(view, payload, payloadEnd)
      }
      else if (type === 'iloc') {
        places = readItemLocations(view, payload)
      }
      else if (type === 'iprp') {
        walkBoxes(view, payload, payloadEnd, (propType, propPayload, propEnd) => {
          if (propType !== 'ipco') {
            return
          }
          walkBoxes(view, propPayload, propEnd, (itemType, itemPayload) => {
            if (itemType === 'ispe') {
              result.width = view.getUint32(itemPayload + 4, false)
              result.height = view.getUint32(itemPayload + 8, false)
            }
            else if (itemType === 'colr') {
              const kind = fourCC(view, itemPayload)
              result.colorProfile = kind === 'rICC' || kind === 'prof' ? 'ICC profile' : 'nclx'
            }
          })
        })
      }
    })
  })

  for (const [id, type] of types) {
    const place = places.get(id)
    if (!place || place.length < 8 || place.offset + place.length > view.byteLength) {
      continue
    }

    if (type === 'Exif') {
      result.blocks.push('EXIF')
      // The first four bytes give the offset of the TIFF header inside the item.
      const start = place.offset + 4 + view.getUint32(place.offset, false)
      const block = parseTiffBlock(view, startsWith(view, start, 'Exif\0\0') ? start + 6 : start)
      result.tags.push(...block.tags)
      result.gps = result.gps ?? block.gps
    }
    else if (type === 'mime') {
      result.blocks.push('XMP')
      result.tags.push({ group: 'XMP', name: 'XMP packet', value: `${place.length} bytes`, private: true })
    }
  }
}

/** Reads the size and the metadata of an image. The bytes stay in the browser. */
export function readImageMetadata(bytes: Uint8Array): ImageMetadata {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const result: ImageMetadata = {
    container: detectContainer(bytes),
    width: null,
    height: null,
    bytes: bytes.byteLength,
    tags: [],
    gps: null,
    blocks: [],
    colorProfile: null,
  }

  try {
    if (result.container === 'jpeg') {
      readJpeg(view, result)
    }
    else if (result.container === 'png') {
      readPng(view, bytes, result)
    }
    else if (result.container === 'webp') {
      readWebp(view, result)
    }
    else if (result.container === 'tiff') {
      readTiff(view, result)
    }
    else if (result.container === 'avif') {
      readAvif(view, result)
    }
  }
  catch {
    // A malformed file gives the tags that the parser read before the error.
  }

  result.blocks = [...new Set(result.blocks)]
  return result
}
