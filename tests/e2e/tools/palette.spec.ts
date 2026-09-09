import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates color palette', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/palette-generator')

  const output = page.getByRole('textbox', { name: 'Configuration Code' })
  const swatches = page.locator('main').getByRole('button', { name: /^Copy shade/ })

  await test.step('generates the full scale of the preset color', async () => {
    await expect(swatches.first()).toBeVisible()
    expect(await swatches.count()).toBe(11)
    await expect(output).toContainText('--brand-500: #7c3aed')
  })

  await test.step('generates a new palette from another base color', async () => {
    await page.getByRole('textbox', { name: 'Base color' }).fill('#059669')

    await expect(output).toContainText('--brand-500: #059669')
    expect(await swatches.count()).toBe(11)
  })
})
