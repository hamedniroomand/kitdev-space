import { test, expect } from '@playwright/test'

test.describe('SQLite Studio', () => {
  test('loads sample database and runs query', async ({ page }) => {
    await page.goto('/hub/data/sqlite-studio')

    // Click load sample database
    await page.getByRole('button', { name: 'Load Sample Database' }).click()

    // Verify sidebar displays tables
    await expect(page.getByText('products')).toBeVisible()
    await expect(page.getByText('customers')).toBeVisible()

    // Verify results table renders sample rows
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
