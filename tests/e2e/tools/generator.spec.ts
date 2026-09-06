import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates random IDs and tokens', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/generator')

  await page.getByRole('button', { name: 'Generate' }).click()

  const items = page.locator('main ul li')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBeGreaterThan(0)
})
