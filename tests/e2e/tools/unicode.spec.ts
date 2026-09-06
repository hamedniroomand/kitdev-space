import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('inspects Unicode characters and detects hidden marks', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/unicode')

  await expect(page.getByText('Hidden Characters Detected')).toBeVisible()
  await expect(page.getByText('Code Points', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Hidden Characters Detected')).not.toBeVisible()
})
