import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('EXIF & Metadata Inspector tool', () => {
  test('inspects image metadata from dropped file', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/metadata')

    await expect(page.getByRole('heading', { name: /Metadata Inspector|EXIF Viewer/, level: 1 })).toBeVisible()

    // 1x1 PNG base64
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )

    await page.locator('input[type="file"]').setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: pngBuffer
    })

    // Verify format and metadata blocks detected
    await expect(page.locator('main').getByText('Format')).toBeVisible()
    await expect(page.locator('main').getByText(/png/i).first()).toBeVisible()
    await expect(page.locator('main').getByText('Metadata blocks', { exact: true })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(page.locator('main').getByText('Format')).not.toBeVisible()
  })
})
