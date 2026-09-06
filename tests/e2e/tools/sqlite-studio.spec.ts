import { test, expect } from '@playwright/test'
import { gotoHydrated } from '../utils'

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

    // Test running a query
    const textarea = page.locator('textarea')
    await textarea.fill('SELECT name FROM products WHERE price > 30;')
    await page.getByRole('button', { name: 'Run Query' }).click()

    // Verify filtered results
    await expect(page.getByText('Mechanical Keyboard')).toBeVisible()
    await expect(page.getByText('Desk Lamp')).not.toBeVisible()
  })
})
