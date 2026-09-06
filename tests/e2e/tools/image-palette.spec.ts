import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('extracts color palette from sample image', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-extractor')

  await page.getByRole('button', { name: 'Load Sample Image' }).click()

  await expect(page.getByRole('heading', { name: /Dominant Colors/ })).toBeVisible()
})
