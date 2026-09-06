import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates Tailwind shades and configuration code', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/tailwind-shades')

  const output = page.getByRole('textbox', { name: 'Configuration Code' })
  await expect(output).toBeVisible()
  await expect(output).toContainText('--color-brand')
})
