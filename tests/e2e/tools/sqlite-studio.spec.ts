import { test, expect } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('SQLite Studio', () => {
  test('loads sample database and runs query', async ({ page }) => {
    await gotoHydrated(page, '/hub/data/sqlite-studio')

    // Click load sample database
    await page.getByRole('button', { name: 'Load Sample Database' }).click()

    // Verify sidebar displays tables
    const tableList = page.locator('aside').filter({
      has: page.getByPlaceholder('Filter tables...')
    })
    await expect(tableList.getByText('products')).toBeVisible()
    await expect(tableList.getByText('customers')).toBeVisible()

    // The studio opens the first table, so select products to see its rows
    await tableList.getByText('products').click()
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()

    // The search box filters the text columns and rewrites the SQL in the editor
    await page.getByLabel('Search text columns').fill('Lamp')
    await expect(page.getByText('Desk Lamp')).toBeVisible()
    await expect(page.getByText('Mechanical Keyboard')).not.toBeVisible()
    await page.getByLabel('Search text columns').fill('')
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()

    // Test running a query
    await fillCodeMirror(page, 'SQL query', 'SELECT name FROM products WHERE price > 30;')
    await page.getByRole('button', { name: 'Run Query' }).click()

    // Verify filtered results
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()
    await expect(page.getByText('Desk Lamp')).not.toBeVisible()
    await expect(page.getByText('The editor holds a custom query.')).toBeVisible()
  })

  test('filters, sorts, pages, and edits rows with the query bar', async ({ page }) => {
    await gotoHydrated(page, '/hub/data/sqlite-studio')
    await page.getByRole('button', { name: 'Load Sample Database' }).click()
    const tableList = page.locator('aside').filter({ has: page.getByPlaceholder('Filter tables...') })
    await tableList.getByText('products').click()
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()

    // A filter builds a WHERE clause and shows as a chip
    await page.getByRole('button', { name: 'Add filter' }).first().click()
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add filter' }) })
    await form.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'price' }).click()
    await form.getByRole('combobox').nth(1).click()
    await page.getByRole('option', { name: 'greater than' }).click()
    await form.getByPlaceholder('A number compares as a number').fill('30')
    await form.getByRole('button', { name: 'Add filter' }).click()
    await expect(page.getByText('price > "30"')).toBeVisible()
    await expect(page.getByText('Desk Lamp')).not.toBeVisible()
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()
    await page.getByRole('button', { name: 'Remove filter price > "30"' }).click()
    await expect(page.getByText('Desk Lamp')).toBeVisible()

    // Sorting a column shows in the chip row and in the SQL
    await page.getByRole('button', { name: 'Sort by price' }).click()
    await expect(page.getByText('sort price asc')).toBeVisible()
    await page.getByRole('button', { name: 'Sort by price' }).click()
    await expect(page.getByText('sort price desc')).toBeVisible()

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
