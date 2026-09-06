import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Markdown Table Generator tool', () => {
  test('generates formatted markdown table and supports row additions', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/markdown-table')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Expect initial markdown output to contain default headers
    const output = page.locator('textarea[readonly]')
    await expect(output).toHaveValue(/Feature.*Status.*Notes/s)

    // Add a row
    await page.getByRole('button', { name: 'Add Row' }).click()

    // Fill the new row's first input
    const inputs = page.locator('tbody input')
    const lastInput = inputs.nth(9) // 3 existing rows * 3 cols = 9
    await lastInput.fill('New Feature')

    await expect(output).toHaveValue(/New Feature/)
  })
})
