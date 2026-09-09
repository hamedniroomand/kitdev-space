import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('extracts color palette from sample image', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-extractor')

  await page.getByRole('button', { name: 'Load Sample Image' }).click()

  await expect(page.getByRole('heading', { name: /Dominant Colors/ })).toBeVisible()
})

test('changes the minimum color distance', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-extractor')

  await page.getByRole('button', { name: 'Load Sample Image' }).click()
  await expect(page.getByRole('heading', { name: /Dominant Colors/ })).toBeVisible()

  const slider = page.getByRole('slider')
  await expect(slider).toHaveAttribute('aria-valuenow', '32')
  await slider.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuenow', '33')
})

test('sends the anchor color to the shades tool', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-extractor')

  await page.getByRole('button', { name: 'Load Sample Image' }).click()
  await page.getByRole('button', { name: /Open .* in the Tailwind shades tool/ }).click()

  await expect(page).toHaveURL('/hub/color/tailwind-shades')
})
