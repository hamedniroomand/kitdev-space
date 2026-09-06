import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Chmod Calculator tool', () => {
  test('calculates permissions, symbolic notation, and preset commands', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/chmod')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default 755
    const octalInput = page.locator('main').getByPlaceholder('755')
    await expect(octalInput).toHaveValue('755')
    await expect(page.locator('main').getByText('chmod 755 file.txt')).toBeVisible()

    // Click 644 preset
    await page.getByRole('button', { name: /644/ }).click()
    await expect(octalInput).toHaveValue('644')
    await expect(page.locator('main').getByText('chmod 644 file.txt')).toBeVisible()
  })
})
