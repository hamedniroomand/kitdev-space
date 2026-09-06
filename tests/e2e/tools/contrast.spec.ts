import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('checks color contrast ratio and WCAG rating', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/contrast-checker')

  await expect(page.getByText('Normal text', { exact: true })).toBeVisible()
  await expect(page.getByText('Large text', { exact: true })).toBeVisible()
  await expect(page.locator('.text-2xl .font-mono')).toBeVisible()
})
