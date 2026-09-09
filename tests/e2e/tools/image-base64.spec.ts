import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Image to Base64 tool', () => {
  test('converts sample image to data URI and switches modes', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/image/base64')

    await expect(page.getByRole('heading', { name: 'Image to Base64', level: 1 })).toBeVisible()

    // Click Load Sample
    await page.getByRole('button', { name: 'Load Sample' }).click()

    // Expect sample file info and Data URI output
    await expect(page.locator('main').getByText('sample.svg')).toBeVisible()
    await expect(page.getByRole('textbox').first()).toHaveValue(/data:image\/svg\+xml;base64/)

    // Overhead callout and exact output length
    await expect(page.locator('main').getByText('Base64 adds about 33 percent')).toBeVisible()
    await expect(page.locator('main').getByText(/\d+ characters/)).toBeVisible()

    // Switch to Base64 -> Image mode
    const decodeButton = page.getByRole('button', { name: 'Base64 → Image' })
    await decodeButton.click()
    await expect(decodeButton).toHaveAttribute('aria-pressed', 'true')
    const textarea = page.getByRole('textbox', { name: 'Base64 String or Data URI' })
    await textarea.fill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

    await expect(page.locator('main').getByText('Decoded Image Preview')).toBeVisible()
    await expect(page.locator('main').getByText('1 × 1 px')).toBeVisible()

    // Malformed input shows an error and hides the preview
    await textarea.fill('not base64!')
    await expect(page.locator('main').getByText(/not valid Base64 data/)).toBeVisible()
    await expect(page.locator('main').getByText('Decoded Image Preview')).toBeHidden()

    // Clear input
    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(textarea).toHaveValue('')
  })
})
