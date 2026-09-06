import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates UUIDs', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/uuid')

  await page.getByRole('button', { name: 'Generate' }).click()

  const items = page.locator('main ul li')
  await expect(items.first()).toBeVisible()
  const text = await items.first().textContent()
  expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
})
