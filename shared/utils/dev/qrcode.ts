import { encode, renderSVG } from 'uqr'

export type QrPayloadKind = 'url' | 'text' | 'wifi'
export type QrEcc = 'L' | 'M' | 'Q' | 'H'

export interface QrWifiOptions {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

export interface QrRenderOptions {
  ecc: QrEcc
  /** Quiet zone width in modules. */
  border: number
}

export interface QrRenderResult {
  svg: string
  /** Module matrix, quiet zone included. `true` is a dark module. */
  matrix: boolean[][]
}

export const QR_MAX_QUIET_ZONE = 10

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

export function buildWifiPayload(options: QrWifiOptions): string {
  const ssid = options.ssid.trim()
  if (!ssid) {
    throw new Error('Enter a Wi-Fi network name.')
  }
  const security = options.security
  const password = security === 'nopass' ? '' : options.password
  if (security !== 'nopass' && !password) {
    throw new Error('Enter a Wi-Fi password.')
  }
  const hidden = options.hidden ? 'true' : 'false'
  return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden};;`
}

export function buildQrPayload(kind: QrPayloadKind, value: string, wifi?: QrWifiOptions): string {
  if (kind === 'wifi') {
    if (!wifi) {
      throw new Error('Enter Wi-Fi details.')
    }
    return buildWifiPayload(wifi)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(kind === 'url' ? 'Enter a URL.' : 'Enter text.')
  }
  if (kind === 'url') {
    try {
      // Accept bare hosts by requiring a parseable absolute URL when scheme exists;
      // otherwise keep the text as entered for common QR URL use.
      if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        void new URL(trimmed)
      }
    }
    catch (cause) {
      throw new Error('Enter a valid URL.', { cause })
    }
  }
  return trimmed
}

/** Keep the quiet zone inside the 0 to 10 module range. */
export function qrQuietZone(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(QR_MAX_QUIET_ZONE, Math.max(0, Math.round(value)))
}

/**
 * Render the QR code one time and keep both outputs.
 *
 * The matrix comes from the same encode pass as the SVG, so the PNG download
 * and the preview always show the same modules.
 */
export function renderQr(payload: string, options: QrRenderOptions): QrRenderResult {
  if (!payload) {
    throw new Error('Enter data for the QR code.')
  }

  let matrix: boolean[][] = []
  try {
    const svg = renderSVG(payload, {
      ecc: options.ecc,
      border: qrQuietZone(options.border),
      pixelSize: 8,
      onEncoded: (qr) => {
        matrix = qr.data
      },
    })
    return { svg, matrix }
  }
  catch (cause) {
    // uqr reports the version 40 capacity limit as "Data too long".
    if (cause instanceof Error && /too long/i.test(cause.message)) {
      throw new Error(
        'The input is too long for one QR code. Remove characters or select a lower error correction level.',
        { cause },
      )
    }
    throw cause
  }
}

export function qrPngFilename(pixels: number): string {
  return `qrcode-${pixels}.png`
}

/**
 * Fit the module grid on a square canvas with whole pixels for each module.
 *
 * A whole module size keeps the edges sharp. The spare pixels go to the margin.
 */
export function qrPngLayout(count: number, pixels: number): { moduleSize: number, offset: number } {
  if (count < 1) {
    throw new Error('The QR code matrix is empty.')
  }
  const moduleSize = Math.floor(pixels / count)
  if (moduleSize < 1) {
    throw new Error('The selected resolution is too small for this QR code.')
  }
  return { moduleSize, offset: Math.floor((pixels - moduleSize * count) / 2) }
}

/**
 * Read a module matrix back from the pixels of a rendered QR code.
 *
 * The E2E test uses it to decode the PNG that the page produced.
 * `dark[y * width + x]` is `true` for a dark pixel.
 */
export function qrMatrixFromPixels(dark: ArrayLike<boolean>, width: number): boolean[][] {
  let top = -1
  let left = width
  let right = -1
  const height = Math.floor(dark.length / width)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!dark[y * width + x]) {
        continue
      }
      if (top < 0) {
        top = y
      }
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
  }
  if (top < 0) {
    throw new Error('The image holds no QR code.')
  }

  // The top row of the code starts with the seven module wide finder pattern.
  let run = 0
  while (dark[top * width + left + run]) {
    run++
  }
  const moduleSize = Math.round(run / 7)
  if (moduleSize < 1) {
    throw new Error('The image resolution is too low to read.')
  }
  const count = Math.round((right + 1 - left) / moduleSize)

  const matrix: boolean[][] = []
  for (let row = 0; row < count; row++) {
    const y = top + Math.floor((row + 0.5) * moduleSize)
    const line: boolean[] = []
    for (let col = 0; col < count; col++) {
      const x = left + Math.floor((col + 0.5) * moduleSize)
      line.push(Boolean(dark[y * width + x]))
    }
    matrix.push(line)
  }
  return matrix
}

function cropQuietZone(matrix: boolean[][]): boolean[][] {
  let top = -1
  let bottom = -1
  let left = matrix.length
  let right = -1

  matrix.forEach((row, y) => {
    row.forEach((module, x) => {
      if (!module) {
        return
      }
      if (top < 0) {
        top = y
      }
      bottom = y
      left = Math.min(left, x)
      right = Math.max(right, x)
    })
  })
  if (top < 0) {
    throw new Error('The QR code matrix is empty.')
  }
  return matrix.slice(top, bottom + 1).map(row => row.slice(left, right + 1))
}

function isMasked(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0
    case 1: return y % 2 === 0
    case 2: return x % 3 === 0
    case 3: return (x + y) % 3 === 0
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5: return (x * y) % 2 + (x * y) % 3 === 0
    case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0
    default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0
  }
}

/** Read the mask pattern from the 15 format bits beside the top left finder pattern. */
function readMaskPattern(matrix: boolean[][]): number {
  const bit = (x: number, y: number) => (matrix[y]?.[x] ? 1 : 0)
  let bits = 0
  for (let i = 0; i <= 5; i++) {
    bits |= bit(8, i) << i
  }
  bits |= bit(8, 7) << 6
  bits |= bit(8, 8) << 7
  bits |= bit(7, 8) << 8
  for (let i = 9; i < 15; i++) {
    bits |= bit(14 - i, 8) << i
  }
  return ((bits ^ 0x5412) >> 10) & 7
}

function readBits(matrix: boolean[][], types: readonly (readonly number[])[], mask: number): number[] {
  const size = matrix.length
  const bits: number[] = []
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5
    }
    for (let vert = 0; vert < size; vert++) {
      for (let step = 0; step < 2; step++) {
        const x = right - step
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        // Module type 0 is a payload module. Function patterns hold no payload bits.
        if (types[y]?.[x] !== 0) {
          continue
        }
        bits.push(matrix[y]![x] !== isMasked(mask, x, y) ? 1 : 0)
      }
    }
  }
  return bits
}

/**
 * Decode the payload of a QR code module matrix.
 *
 * It reads version 1 and version 2 codes, which hold one block of codewords
 * and need no error correction pass. The E2E test uses it as the QR scanner
 * when the browser has no `BarcodeDetector`.
 */
export function decodeQrMatrix(matrix: boolean[][]): string {
  const code = cropQuietZone(matrix)
  const version = (code.length - 17) / 4
  if (!Number.isInteger(version) || version < 1 || version > 2) {
    throw new Error('The test decoder reads version 1 and version 2 QR codes only.')
  }

  // The function pattern layout depends on the version only, so an empty
  // code of the same version supplies the module type map.
  const { types } = encode('', { minVersion: version, maxVersion: version, border: 0 })
  const bits = readBits(code, types, readMaskPattern(code))

  let at = 0
  const take = (length: number) => {
    let value = 0
    for (let i = 0; i < length; i++) {
      value = (value << 1) | (bits[at++] ?? 0)
    }
    return value
  }

  const mode = take(4)
  if (mode === 1) {
    const count = take(10)
    let out = ''
    for (let i = 0; i < count;) {
      const left = count - i
      if (left >= 3) {
        out += String(take(10)).padStart(3, '0')
        i += 3
      }
      else if (left === 2) {
        out += String(take(7)).padStart(2, '0')
        i += 2
      }
      else {
        out += String(take(4))
        i += 1
      }
    }
    return out
  }
  if (mode === 2) {
    const count = take(9)
    let out = ''
    for (let i = 0; i < count;) {
      if (count - i >= 2) {
        const pair = take(11)
        out += (ALPHANUMERIC[Math.floor(pair / 45)] ?? '') + (ALPHANUMERIC[pair % 45] ?? '')
        i += 2
      }
      else {
        out += ALPHANUMERIC[take(6)] ?? ''
        i += 1
      }
    }
    return out
  }
  if (mode === 4) {
    const count = take(8)
    const bytes = new Uint8Array(count)
    for (let i = 0; i < count; i++) {
      bytes[i] = take(8)
    }
    return new TextDecoder().decode(bytes)
  }
  throw new Error(`The test decoder does not read QR mode ${mode}.`)
}
