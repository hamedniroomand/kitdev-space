import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

// 1x1 PNG base64
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('EXIF & Metadata Inspector tool', () => {
  test('inspects image metadata from dropped file', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/image/metadata')

    await expect(page.getByRole('heading', { name: /Metadata Inspector|EXIF Viewer/, level: 1 })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    })

    // Verify format and metadata blocks detected
    await expect(page.locator('main').getByText('Format', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText(/png/i).first()).toBeVisible()
    await expect(page.locator('main').getByText('Metadata blocks', { exact: true })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(page.locator('main').getByText('Format', { exact: true })).not.toBeVisible()
  })

  test('lists the supported formats and shows the empty state', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/metadata')

    await expect(page.locator('main').getByText(/JPEG, PNG, WebP, AVIF, and TIFF/)).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    })

    await expect(page.locator('main').getByText('No supported metadata found', { exact: true })).toBeVisible()
  })

  test('strips a batch of photos and shows the audit report', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/metadata')

    await page.locator('input[type="file"]').setInputFiles([
      { name: 'one.png', mimeType: 'image/png', buffer: pngBuffer },
      { name: 'two.png', mimeType: 'image/png', buffer: pngBuffer },
    ])

    await expect(page.locator('main').getByRole('heading', { name: 'Blocks to remove' })).toBeVisible()

    await page.locator('main').getByRole('button', { name: 'Remove from all files' }).click()

    await expect(page.locator('main').getByRole('heading', { name: 'Audit report for 2 files' })).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Download the zip' })).toBeVisible()
  })
})
