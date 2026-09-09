import type { QrEcc } from '#shared/utils/dev/qrcode'
import { describe, expect, it } from 'vitest'
import {
  buildQrPayload,
  buildWifiPayload,
  decodeQrMatrix,
  qrMatrixFromPixels,
  qrPngFilename,
  qrPngLayout,
  qrQuietZone,
  renderQr,
} from '#shared/utils/dev/qrcode'

const ECC_LEVELS: QrEcc[] = ['L', 'M', 'Q', 'H']
/** Short enough to stay inside version 2 at every error correction level. */
const SHORT_PAYLOAD = 'https://a.co'

/** Paint the module matrix the same way the page paints the PNG canvas. */
function paint(matrix: boolean[][], pixels: number): boolean[] {
  const { moduleSize, offset } = qrPngLayout(matrix.length, pixels)
  const dark = Array.from<boolean>({ length: pixels * pixels }).fill(false)
  matrix.forEach((row, rowIndex) => {
    row.forEach((module, colIndex) => {
      if (!module) {
        return
      }
      const top = offset + rowIndex * moduleSize
      const left = offset + colIndex * moduleSize
      for (let y = top; y < top + moduleSize; y++) {
        for (let x = left; x < left + moduleSize; x++) {
          dark[y * pixels + x] = true
        }
      }
    })
  })
  return dark
}

describe('qrcode', () => {
  it('builds wifi payloads', () => {
    expect(buildWifiPayload({
      ssid: 'Cafe;Net',
      password: 'p@ss',
      security: 'WPA',
    })).toBe('WIFI:T:WPA;S:Cafe\\;Net;P:p@ss;H:false;;')
  })

  it('builds url payloads', () => {
    expect(buildQrPayload('url', 'https://example.com')).toBe('https://example.com')
  })

  it('renders svg markup and the module matrix together', () => {
    const { svg, matrix } = renderQr('hello', { ecc: 'M', border: 4 })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    // Version 1 is 21 modules wide. The quiet zone adds 4 modules on each side.
    expect(matrix.length).toBe(29)
    expect(matrix[0]!.length).toBe(29)
  })

  it('grows the matrix with the quiet zone', () => {
    expect(renderQr('hello', { ecc: 'M', border: 0 }).matrix.length).toBe(21)
    expect(renderQr('hello', { ecc: 'M', border: 10 }).matrix.length).toBe(41)
  })

  it('reports input above the qr code capacity', () => {
    // uqr holds 2953 bytes at level L. The limit comes from the library.
    expect(() => renderQr('a'.repeat(2954), { ecc: 'L', border: 4 })).toThrow(/too long/i)
    expect(() => renderQr('a'.repeat(1300), { ecc: 'H', border: 4 })).toThrow(/too long/i)
  })

  it('names the png file after the resolution', () => {
    expect(qrPngFilename(1024)).toBe('qrcode-1024.png')
    expect(qrPngFilename(256)).toBe('qrcode-256.png')
  })

  it('clamps the quiet zone to 0 to 10 modules', () => {
    expect(qrQuietZone(-3)).toBe(0)
    expect(qrQuietZone(4)).toBe(4)
    expect(qrQuietZone(11)).toBe(10)
    expect(qrQuietZone(Number.NaN)).toBe(0)
  })

  it('fits whole modules on the canvas', () => {
    expect(qrPngLayout(29, 256)).toEqual({ moduleSize: 8, offset: 12 })
    expect(qrPngLayout(29, 1024)).toEqual({ moduleSize: 35, offset: 4 })
    expect(() => qrPngLayout(179, 128)).toThrow(/too small/i)
  })

  it('decodes the matrix back to the payload', () => {
    for (const ecc of ECC_LEVELS) {
      for (const border of [0, 1, 4, 10]) {
        const { matrix } = renderQr(SHORT_PAYLOAD, { ecc, border })
        expect(matrix.length - border * 2).toBeLessThanOrEqual(25)
        expect(decodeQrMatrix(matrix)).toBe(SHORT_PAYLOAD)
      }
    }
  })

  it('decodes numeric, alphanumeric, and unicode payloads', () => {
    for (const payload of ['1234567890', 'HELLO QR', 'Ünïcödé']) {
      expect(decodeQrMatrix(renderQr(payload, { ecc: 'L', border: 4 }).matrix)).toBe(payload)
    }
  })

  it('refuses codes above version 2', () => {
    const { matrix } = renderQr('https://kitdev.space/hub/dev/qr-code', { ecc: 'H', border: 4 })
    expect(() => decodeQrMatrix(matrix)).toThrow(/version 1 and version 2/i)
  })

  it('decodes the payload from painted png pixels', () => {
    for (const pixels of [256, 512, 1024, 2048]) {
      const { matrix } = renderQr(SHORT_PAYLOAD, { ecc: 'M', border: 4 })
      const read = qrMatrixFromPixels(paint(matrix, pixels), pixels)
      expect(decodeQrMatrix(read)).toBe(SHORT_PAYLOAD)
    }
  })
})
