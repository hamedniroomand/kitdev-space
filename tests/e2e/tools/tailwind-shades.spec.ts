import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates Tailwind shades and configuration code', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/tailwind-shades')

  const output = page.getByRole('textbox', { name: 'Configuration Code' })

  await test.step('generates default brand palette configuration', async () => {
    await expect(output).toBeVisible()
    await expect(output).toContainText('--color-brand-500: #3b82f6')
  })

  await test.step('updates scale from preset button', async () => {
    await page.getByRole('button', { name: 'Emerald' }).click()
    await expect(output).toContainText('--color-brand-500: #10b981')
  })

  await test.step('updates token name and switches format to Tailwind v3', async () => {
    const tokenInput = page.getByPlaceholder('e.g. brand, primary, accent')
    await tokenInput.fill('accent')
    await page.getByRole('button', { name: 'Tailwind v3 (config)' }).click()

    await expect(output).toContainText('\'accent\': {')
    await expect(output).toContainText('\'500\': \'#10b981\'')
  })
})
