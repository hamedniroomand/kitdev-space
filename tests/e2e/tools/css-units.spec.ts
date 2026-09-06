import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('CSS Unit Converter tool', () => {
  test('converts CSS units and updates on input change', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/css-units')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default 16px conversions
    await expect(page.locator('main').getByText('1rem', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('1em', { exact: true })).toBeVisible()

    // Change input value to 32
    const input = page.locator('input[type="number"]').first()
    await input.fill('32')

    // Expect updated values
    await expect(page.locator('main').getByText('2rem', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('2em', { exact: true })).toBeVisible()

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('main').getByText('1rem', { exact: true })).toBeVisible()
  })
})
