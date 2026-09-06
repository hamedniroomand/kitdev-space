import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('QR Code Studio tool', () => {
  test('generates QR code SVG from URL and supports clear', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/qr-code')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Click Generate button
    await page.getByRole('button', { name: 'Generate' }).click()

    // Expect QR code preview image to be visible
    const img = page.locator('main img[alt="QR code preview"]')
    await expect(img).toBeVisible()

    // Test clear
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(img).not.toBeVisible()
  })
})
