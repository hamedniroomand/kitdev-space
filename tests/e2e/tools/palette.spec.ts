import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates color palette', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-generator')

  await page.getByRole('button', { name: 'Generate' }).click()

  const swatches = page.locator('main').getByRole('button', { name: /^#/ })
  await expect(swatches.first()).toBeVisible()
  expect(await swatches.count()).toBeGreaterThanOrEqual(3)
})
