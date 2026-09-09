import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Placeholder Image Generator tool', () => {
  test('generates placeholder SVG and handles dimension presets', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/image/placeholder')

    await expect(page.getByRole('heading', { name: 'Placeholder Image Generator', level: 1 })).toBeVisible()

    // Test dimension preset
    await page.getByRole('button', { name: '1200 × 630 (OG)' }).click()
    await expect(page.locator('input[type="number"]').first()).toHaveValue('1200')
    await expect(page.locator('input[type="number"]').nth(1)).toHaveValue('630')

    // Enter custom label text
    const textInput = page.getByPlaceholder('e.g. Hero Image, Banner')
    await textInput.fill('Hero Banner')
    await expect(page.locator('textarea').first()).toHaveValue(/Hero Banner/)

    // Switch background style to gradient
    await page.getByRole('button', { name: 'Gradient' }).click()

    // Verify Download SVG button is present and active
    const downloadButton = page.getByRole('button', { name: 'Download SVG' })
    await expect(downloadButton).toBeVisible()
    await expect(downloadButton).toBeEnabled()

    // The HTML img tag output carries the chosen dimensions
    await expect(page.getByRole('button', { name: 'Copy HTML tag', exact: true })).toBeVisible()
    await expect(page.getByLabel('HTML img tag')).toHaveValue(/<img src="data:image\/svg\+xml;base64,.+" width="1200" height="630" alt="Hero Banner">/)
  })
})
