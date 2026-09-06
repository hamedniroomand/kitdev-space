import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('calculates text statistics', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/text-stats')

  const input = page.getByPlaceholder('Type or paste text here to see statistics...')
  await input.fill('One two three four five.')

  await expect(page.getByText('Words', { exact: true })).toBeVisible()
  await expect(page.locator('div').filter({ has: page.getByText('Words', { exact: true }) }).getByText('5', { exact: true })).toBeVisible()
})
