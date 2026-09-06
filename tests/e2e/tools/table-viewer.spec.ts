import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('displays table and filters rows', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/table-viewer')

  const table = page.locator('tbody')
  await expect(table.getByText('Alice Smith', { exact: true })).toBeVisible()
  await expect(table.getByText('Bob Jones', { exact: true })).toBeVisible()

  await page.getByPlaceholder('Search table rows...').fill('Alice')
  await expect(table.getByText('Alice Smith', { exact: true })).toBeVisible()
  await expect(table.getByText('Bob Jones', { exact: true })).not.toBeVisible()
})
