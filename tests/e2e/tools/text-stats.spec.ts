import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('calculates text statistics', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/text-stats')

  const input = page.locator('textarea')
  await input.fill('One two three four five.')

  await expect(page.getByText('Words', { exact: true })).toBeVisible()
  await expect(page.locator('.text-2xl', { hasText: '5' }).first()).toBeVisible()
})
