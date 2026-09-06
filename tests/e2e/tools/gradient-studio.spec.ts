import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('designs CSS gradients and shows code declaration', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/gradient-studio')

  const pre = page.locator('main pre')
  await expect(pre).toBeVisible()
  await expect(pre).toContainText('linear-gradient')
})
