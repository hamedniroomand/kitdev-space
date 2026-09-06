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

    // Switch to Base64 -> Image mode
    await page.getByRole('button', { name: 'Base64 → Image' }).click()
    const textarea = page.getByPlaceholder('Paste raw Base64 string or data:image/... URI...')
    await textarea.fill('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

    await expect(page.locator('main').getByText('Decoded Image Preview')).toBeVisible()

    // Clear input
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(textarea).toHaveValue('')
  })
})
