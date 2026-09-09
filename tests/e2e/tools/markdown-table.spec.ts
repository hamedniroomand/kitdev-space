import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Markdown Table Generator tool', () => {
  test('generates formatted markdown table and supports row additions', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/markdown-table')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // The output is a read-only CodeMirror editor, so assert on its text.
    const output = page.getByRole('textbox', { name: 'Markdown Output' })
    await expect(output).toContainText('Feature')
    await expect(output).toContainText('Status')
    await expect(output).toContainText('Notes')

    // Add a row
    await page.getByRole('button', { name: 'Add Row' }).click()

    // Fill the new row's first input
    const inputs = page.locator('tbody input')
    const lastInput = inputs.nth(9) // 3 existing rows * 3 cols = 9
    await lastInput.fill('New Feature')

    await expect(output).toContainText('New Feature')
  })
})
