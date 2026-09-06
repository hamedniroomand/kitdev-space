import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('SQLite Studio', () => {
  test('loads sample database, queries, filters, sorts, and edits rows', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/data/sqlite-studio')

    // Click load sample database
    await page.getByRole('button', { name: 'Load Sample Database' }).click()

    const tableList = page.locator('aside').filter({
      has: page.getByPlaceholder('Filter tables...'),
    })

    await test.step('loads sample database and runs query', async () => {
      await expect(tableList.getByText('products', { exact: true })).toBeVisible()
      await expect(tableList.getByText('customers', { exact: true })).toBeVisible()

      // The studio opens the first table, so select products to see its rows
      await tableList.getByText('products', { exact: true }).click()
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).toBeVisible()

      // The search box filters the text columns and rewrites the SQL in the editor
      await page.getByLabel('Search text columns').fill('Lamp')
      await expect(page.getByText('Desk Lamp', { exact: true })).toBeVisible()
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).not.toBeVisible()
      await page.getByLabel('Search text columns').fill('')
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).toBeVisible()

      // Test running a query
      await fillCodeMirror(page, 'SQL query', 'SELECT name FROM products WHERE price > 30;')
      await page.getByRole('button', { name: 'Run Query' }).click()

      // Verify filtered results
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).toBeVisible()
      await expect(page.getByText('Desk Lamp', { exact: true })).not.toBeVisible()
      await expect(page.getByText('The editor holds a custom query. The filters and the row actions apply to the table view.', { exact: true })).toBeVisible()
    })

    await test.step('filters, sorts, pages, and edits rows with the query bar', async () => {
      // Re-select products to reset query
      await tableList.getByText('products', { exact: true }).click()
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).toBeVisible()

      // A filter builds a WHERE clause and shows as a chip
      await page.getByRole('button', { name: 'Add filter' }).first().click()
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add filter' }) })
      await form.getByRole('combobox').first().click()
      await page.getByRole('option', { name: 'price' }).click()
      await form.getByRole('combobox').nth(1).click()
      await page.getByRole('option', { name: 'greater than' }).click()
      await form.getByPlaceholder('A number compares as a number').fill('30')
      await form.getByRole('button', { name: 'Add filter' }).click()
      await expect(page.getByText('price > "30"', { exact: true })).toBeVisible()
      await expect(page.getByText('Desk Lamp', { exact: true })).not.toBeVisible()
      await expect(page.getByText('Mechanical Keyboard', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Remove filter price > "30"' }).click()
      await expect(page.getByText('Desk Lamp', { exact: true })).toBeVisible()

      // Sorting a column shows in the chip row and in the SQL
      await page.getByRole('button', { name: 'Sort by price' }).click()
      await expect(page.getByText('sort price asc', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Sort by price' }).click()
      await expect(page.getByText('sort price desc', { exact: true })).toBeVisible()

      // The row range shows the offset and the filtered total
      const range = page.getByText(/1–\d+ of \d+/)
      await expect(range).toBeVisible()

      // Row actions: add, then delete the selected row, and read the schema
      const rangeBefore = (await range.textContent())?.trim() ?? ''
      await page.getByRole('button', { name: 'Add row' }).click()
      await expect(range).not.toHaveText(rangeBefore)

      await page.getByRole('button', { name: 'Select row 1' }).click()
      await page.getByRole('button', { name: 'Duplicate' }).click()
      await expect(range).toBeVisible()

      await page.getByRole('button', { name: 'Select row 1' }).click()
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await page.getByRole('button', { name: 'Confirm delete' }).click()
      await expect(page.getByRole('button', { name: 'Confirm delete' })).not.toBeVisible()

      await page.getByRole('button', { name: 'Schema' }).click()
      await expect(page.getByText('CREATE TABLE products')).toBeVisible()
    })
  })
})
