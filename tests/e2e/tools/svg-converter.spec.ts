import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('SVG to PNG / WebP converter tool', () => {
  test('converts SVG markup to raster images and supports clear', async ({ page }) => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await page.route('**/api/image/svg-convert', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: {
          'x-image-width': '120',
          'x-image-height': '80',
          'x-image-bytes': '70'
        },
        body: pngBuffer
      })
    })

    await gotoHydrated(page, '/hub/image/svg-converter')

    await expect(page.getByRole('heading', { name: /SVG to PNG/, level: 1 })).toBeVisible()

    // Click Convert button with default sample SVG
    await page.locator('main').getByRole('button', { name: 'Convert', exact: true }).click()

    // Wait for 1x, 2x, 4x scale cards to be generated
    await expect(page.locator('main').getByText('1x', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('main').getByText('2x', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('4x', { exact: true })).toBeVisible()

    // Clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('1x', { exact: true })).not.toBeVisible()
  })
})
