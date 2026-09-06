import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('inspects color properties and channels', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/inspector')

  await page.getByRole('button', { name: 'Inspect' }).click()

  const dl = page.locator('main dl')
  await expect(dl.getByText('HEX', { exact: true })).toBeVisible()
  await expect(dl.getByText('#7c3aed', { exact: true })).toBeVisible()
})
