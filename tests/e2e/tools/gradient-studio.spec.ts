import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('designs CSS gradients and shows code declaration', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/gradient-studio')

  const pre = page.locator('main pre')

  await test.step('shows default linear gradient CSS', async () => {
    await expect(pre).toBeVisible()
    await expect(pre).toContainText('linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)')
  })

  await test.step('switches to radial gradient', async () => {
    const typeSelect = page.locator('select, [role="combobox"]').first()
    await typeSelect.click()
    await page.getByRole('option', { name: 'Radial' }).click()
    await expect(pre).toContainText('radial-gradient(circle, #7c3aed 0%, #06b6d4 100%)')
  })

  await test.step('adds color stop and resets', async () => {
    await page.getByRole('button', { name: 'Add stop' }).click()
    await expect(pre).toContainText('#f59e0b')

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(pre).toContainText('linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)')
    await expect(pre).not.toContainText('#f59e0b')
  })
})
