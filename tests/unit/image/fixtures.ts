/**
 * Byte builders for the image metadata tests.
 * A real photo is not needed. The parser reads the container structure only.
 */

function u16be(value: number) {
  return [value >> 8 & 0xFF, value & 0xFF]
}

function u32be(value: number) {
  return [value >>> 24 & 0xFF, value >>> 16 & 0xFF, value >>> 8 & 0xFF, value & 0xFF]
}

function chars(text: string) {
  return [...text].map(char => char.charCodeAt(0))
}

interface TiffEntry {
  tag: number
  type: number
  count: number
  /** Four inline bytes, or the offset of the value inside the TIFF block. */
  value: number[]
}

function entry(tag: number, type: number, count: number, value: number[]): TiffEntry {
  return { tag, type, count, value: [...value, 0, 0, 0, 0].slice(0, 4) }
}

/**
 * Builds a big-endian TIFF block with IFD0, an EXIF sub block, and a GPS block.
 * The position is 48.8584 N, 2.2945 E.
 */
export function buildTiffBlock(): number[] {
  // Layout: header(8) IFD0 -> EXIF IFD -> GPS IFD -> value pool.
  const header = [0x4D, 0x4D, ...u16be(42), ...u32be(8)]

  const makeText = chars('TestCam\0')
  const modelText = chars('Model X\0')

  // The value pool sits after the three IFDs. Sizes are fixed, so compute them.
  const ifd0Size = 2 + 5 * 12 + 4
  const exifSize = 2 + 2 * 12 + 4
  const gpsSize = 2 + 5 * 12 + 4

  const ifd0At = 8
  const exifAt = ifd0At + ifd0Size
  const gpsAt = exifAt + exifSize
  const poolAt = gpsAt + gpsSize

  const makeAt = poolAt
  const modelAt = makeAt + makeText.length
  const exposureAt = modelAt + modelText.length
  const latAt = exposureAt + 8
  const lonAt = latAt + 24

  const ifd0: TiffEntry[] = [
    entry(0x010F, 2, makeText.length, u32be(makeAt)),
    entry(0x0110, 2, modelText.length, u32be(modelAt)),
    entry(0x0112, 3, 1, u16be(6)),
    entry(0x8769, 4, 1, u32be(exifAt)),
    entry(0x8825, 4, 1, u32be(gpsAt))
  ]

  const exif: TiffEntry[] = [
    entry(0x829A, 5, 1, u32be(exposureAt)),
    entry(0x8827, 3, 1, u16be(400))
  ]

  const gps: TiffEntry[] = [
    entry(0x0001, 2, 2, chars('N\0')),
    entry(0x0002, 5, 3, u32be(latAt)),
    entry(0x0003, 2, 2, chars('E\0')),
    entry(0x0004, 5, 3, u32be(lonAt)),
    entry(0x0005, 1, 1, [0])
  ]

  function writeIfd(entries: TiffEntry[]) {
    const out = [...u16be(entries.length)]
    for (const item of entries) {
      out.push(...u16be(item.tag), ...u16be(item.type), ...u32be(item.count), ...item.value)
    }
    out.push(...u32be(0))
    return out
  }

  function rational(numerator: number, denominator: number) {
    return [...u32be(numerator), ...u32be(denominator)]
  }

  const pool = [
    ...makeText,
    ...modelText,
    ...rational(1, 125),
    // 48° 51' 30.24"
    ...rational(48, 1), ...rational(51, 1), ...rational(3024, 100),
    // 2° 17' 40.2"
    ...rational(2, 1), ...rational(17, 1), ...rational(402, 10)
  ]

  return [...header, ...writeIfd(ifd0), ...writeIfd(exif), ...writeIfd(gps), ...pool]
}

/** A JPEG with an APP1 EXIF segment, a comment, an SOF0, and scan data. */
export function buildJpeg(): Uint8Array {
  const tiff = buildTiffBlock()
  const exifPayload = [...chars('Exif\0\0'), ...tiff]
  const comment = chars('private note')
  const scan = [0xFF, 0xDA, ...u16be(8), 1, 1, 0, 0, 63, 0, 0x11, 0x22, 0x33, 0xFF, 0xD9]

  return new Uint8Array([
    0xFF, 0xD8,
    // APP0 JFIF
    0xFF, 0xE0, ...u16be(16), ...chars('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0,
    // APP1 EXIF
    0xFF, 0xE1, ...u16be(exifPayload.length + 2), ...exifPayload,
    // Comment
    0xFF, 0xFE, ...u16be(comment.length + 2), ...comment,
    // SOF0 with a 40 x 30 frame
    0xFF, 0xC0, ...u16be(11), 8, ...u16be(30), ...u16be(40), 1, 1, 0x11, 0,
    ...scan
  ])
}

const CRC_TABLE = (() => {
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

function crc32(bytes: number[]): number {
  let value = 0xFFFFFFFF
  for (const byte of bytes) {
    value = CRC_TABLE[(value ^ byte) & 0xFF]! ^ (value >>> 8)
  }
  return (value ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(name: string, payload: number[]): number[] {
  const body = [...chars(name), ...payload]
  return [...u32be(payload.length), ...body, ...u32be(crc32(body))]
}

/** A PNG with an IHDR, an eXIf chunk, a tEXt chunk, an IDAT, and an IEND. */
export function buildPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    ...pngChunk('IHDR', [...u32be(40), ...u32be(30), 8, 2, 0, 0, 0]),
    ...pngChunk('eXIf', buildTiffBlock()),
    ...pngChunk('tEXt', [...chars('Author'), 0, ...chars('Jane')]),
    ...pngChunk('IDAT', [0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01]),
    ...pngChunk('IEND', [])
  ])
}

function riffChunk(name: string, payload: number[]): number[] {
  const size = payload.length
  const little = [size & 0xFF, size >> 8 & 0xFF, size >> 16 & 0xFF, size >>> 24 & 0xFF]
  const padding = size % 2 ? [0] : []
  return [...chars(name), ...little, ...payload, ...padding]
}

/** An extended WebP with a VP8X, an EXIF chunk, and an XMP chunk. */
export function buildWebp(): Uint8Array {
  const body = [
    ...chars('WEBP'),
    // VP8X. The flag byte states that the file holds EXIF and XMP.
    ...riffChunk('VP8X', [0x0C, 0, 0, 0, 39, 0, 0, 29, 0, 0]),
    ...riffChunk('VP8 ', [0x11, 0x22, 0x33, 0x44]),
    ...riffChunk('EXIF', buildTiffBlock()),
    ...riffChunk('XMP ', chars('<x:xmpmeta/>'))
  ]

  return new Uint8Array([...chars('RIFF'), ...[
    body.length & 0xFF, body.length >> 8 & 0xFF, body.length >> 16 & 0xFF, body.length >>> 24 & 0xFF
  ], ...body])
}
