import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts color formats', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/converter')

  await expect(page.getByText('HEX', { exact: true })).toBeVisible()
  await expect(page.getByText('#7c3aed').first()).toBeVisible()
  await expect(page.getByText('RGB', { exact: true })).toBeVisible()
  await expect(page.getByText('HSL', { exact: true })).toBeVisible()
  await expect(page.getByText('OKLCH', { exact: true })).toBeVisible()
})
