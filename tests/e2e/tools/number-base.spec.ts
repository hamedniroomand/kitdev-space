import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts numbers across bases', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/number-base')

  await page.getByRole('button', { name: '255 (8-bit max)' }).click()

  // HEX should be FF
  const hexInput = page.locator('input').nth(1)
  await expect(hexInput).toHaveValue('FF')
})
