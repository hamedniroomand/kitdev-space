import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('Markdown Table Generator tool', () => {
  test('generates formatted markdown table and supports row additions', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/markdown-table')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // The output is a read-only CodeMirror editor, so assert on its text.
    const output = page.getByRole('textbox', { name: 'Markdown Output' })
    await expect(output).toContainText('Feature')
    await expect(output).toContainText('Status')
    await expect(output).toContainText('Notes')

    await page.getByRole('button', { name: 'Add Row' }).click()

    await page
      .getByRole('textbox', { name: 'Row 4 column 1 (Feature) value', exact: true })
      .fill('New Feature')

    await expect(output).toContainText('New Feature')
  })

  test('imports a markdown table and reorders rows', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/markdown-table')

    await fillCodeMirror(
      page,
      'Markdown or spreadsheet input',
      '| Name | Price |\n| --- | ---: |\n| Apple | 1 |\n| Banana | 2 |',
    )
    await page.getByRole('button', { name: 'Import the pasted table into the grid' }).click()

    const output = page.getByRole('textbox', { name: 'Markdown Output' })
    await expect(output).toContainText('Apple')
    await expect(output).toContainText('Banana')

    // The first row cannot move up, so its button stays disabled.
    await expect(page.getByRole('button', { name: 'Move row 1 up' })).toBeDisabled()

    await page.getByRole('button', { name: 'Move row 1 down' }).click()
    await expect(
      page.getByRole('textbox', { name: 'Row 1 column 1 (Name) value', exact: true }),
    ).toHaveValue('Banana')
  })
})
