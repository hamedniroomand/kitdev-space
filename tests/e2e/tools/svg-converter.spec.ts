import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('SVG to PNG / WebP converter tool', () => {
  test('converts SVG markup to raster images and supports clear', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/image/svg-converter')

    await expect(page.getByRole('heading', { name: /SVG to PNG/, level: 1 })).toBeVisible()

    const main = page.locator('main')

    // Click Convert button with default sample SVG
    await main.getByRole('button', { name: 'Convert', exact: true }).click()

    // Wait for 1x, 2x, 3x scale cards to be generated
    await expect(main.getByRole('button', { name: 'Download 1x' })).toBeVisible({ timeout: 15_000 })
    await expect(main.getByRole('button', { name: 'Download 2x' })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Download 3x' })).toBeVisible()

    // One zip download holds every scale
    await expect(main.getByRole('button', { name: 'Download ZIP' })).toBeVisible()

    // Each card reports the output size in bytes
    await expect(main.getByText('bytes').first()).toBeVisible()

    // Clear
    await main.getByRole('button', { name: 'Clear' }).click()
    await expect(main.getByRole('button', { name: 'Download 1x' })).not.toBeVisible()
  })

  test('converts only the selected scales', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/svg-converter')

    const main = page.locator('main')

    await main.getByRole('checkbox', { name: '2x' }).click()
    await main.getByRole('checkbox', { name: '3x' }).click()
    await expect(main.getByRole('checkbox', { name: '2x' })).not.toBeChecked()

    await main.getByRole('button', { name: 'Convert', exact: true }).click()

    await expect(main.getByRole('button', { name: 'Download 1x' })).toBeVisible({ timeout: 15_000 })
    await expect(main.getByRole('button', { name: 'Download 2x' })).not.toBeVisible()
  })
})
