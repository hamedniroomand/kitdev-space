import { expect, test } from '@playwright/test'
import { decodeQrMatrix, qrMatrixFromPixels } from '../../../shared/utils/dev/qrcode'
import { fillCodeMirror, gotoHydrated } from '../utils'

/** Short enough to stay inside version 2, which the test decoder reads. */
const PAYLOAD = 'https://a.co'

/**
 * The page reads the PNG blob back with `BarcodeDetector` when the browser has
 * one. Playwright Chromium often has no barcode service, so the fallback
 * returns the pixels and the test decoder reads the modules.
 */
type PngRead
  = | { error: string }
    | { decoded: string }
    | { width: number, dark: string }

test.describe('QR Code Studio tool', () => {
  test('updates the preview after typing stops', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/qr-code')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const preview = page.locator('main img[alt="QR code preview"]')
    await expect(preview).toBeVisible()
    const first = await preview.getAttribute('src')

    await fillCodeMirror(page, 'URL', PAYLOAD)
    await expect.poll(() => preview.getAttribute('src')).not.toBe(first)

    // 4000 bytes are above the capacity of one QR code at every level.
    await fillCodeMirror(page, 'URL', 'a'.repeat(4000))
    await expect(page.getByText(/too long for one QR code/)).toBeVisible()
    await expect(preview).toHaveCount(0)

    await fillCodeMirror(page, 'URL', PAYLOAD)
    await expect(preview).toBeVisible()
  })

  test('downloads a png that decodes to the entered payload', async ({ page }) => {
    // `useDownload` revokes the object URL at once, so keep the blob itself.
    await page.addInitScript(() => {
      const create = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (source: Blob | MediaSource) => {
        if (source instanceof Blob) {
          (window as unknown as { __qrBlob?: Blob }).__qrBlob = source
        }
        return create(source)
      }
    })

    await gotoHydrated(page, '/hub/dev/qr-code')
    await fillCodeMirror(page, 'URL', PAYLOAD)
    await expect(page.locator('main img[alt="QR code preview"]')).toBeVisible()

    await page.getByRole('button', { name: 'Download PNG' }).click()

    const read = await page.evaluate<PngRead>(async () => {
      const blob = (window as unknown as { __qrBlob?: Blob }).__qrBlob
      if (!blob) {
        return { error: 'The page produced no PNG blob.' }
      }
      if (blob.type !== 'image/png') {
        return { error: `The blob type is ${blob.type}.` }
      }
      const bitmap = await createImageBitmap(blob)

      const Detector = (window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => {
          detect: (image: ImageBitmap) => Promise<{ rawValue: string }[]>
        }
      }).BarcodeDetector
      if (Detector) {
        const decoded = await new Detector({ formats: ['qr_code'] })
          .detect(bitmap)
          .then(codes => codes[0]?.rawValue)
          .catch(() => undefined)
        if (decoded) {
          return { decoded }
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) {
        return { error: 'The test browser gives no 2d context.' }
      }
      context.drawImage(bitmap, 0, 0)
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      let dark = ''
      for (let i = 0; i < data.length; i += 4) {
        dark += (data[i] ?? 255) < 128 ? '1' : '0'
      }
      return { width: canvas.width, dark }
    })

    if ('error' in read) {
      throw new Error(read.error)
    }
    if ('decoded' in read) {
      expect(read.decoded).toBe(PAYLOAD)
      return
    }
    const matrix = qrMatrixFromPixels(Array.from(read.dark, char => char === '1'), read.width)
    expect(decodeQrMatrix(matrix)).toBe(PAYLOAD)
  })
})
