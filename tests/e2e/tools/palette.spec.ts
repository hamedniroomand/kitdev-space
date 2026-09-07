import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates color palette', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-generator')

  const getSwatches = () => page.locator('main').getByRole('button', { name: /^#/ })

  await test.step('generates default 5-color palette', async () => {
    const swatches = getSwatches()
    await expect(swatches.first()).toBeVisible()
    expect(await swatches.count()).toBe(5)
  })

  await test.step('generates custom 8-color palette with new base color', async () => {
    await page.getByRole('textbox', { name: 'Base color' }).fill('#059669')
    await page.getByRole('spinbutton').fill('8')
    await page.getByRole('button', { name: 'Generate' }).click()

    const swatches = getSwatches()
    await expect(swatches.first()).toBeVisible()
    expect(await swatches.count()).toBe(8)
    await expect(page.getByText('#059669')).toBeVisible()
  })

  await test.step('clears palette', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    expect(await getSwatches().count()).toBe(0)
  })
})
