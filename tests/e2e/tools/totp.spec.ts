import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates time-based one-time passwords', async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/totp')

  await expect(page.getByText('Current One-Time Password')).toBeVisible()
  const codeContainer = page.locator('.tracking-widest.text-primary')
  await expect(codeContainer).toBeVisible()
  const digits = await codeContainer.textContent()
  expect(digits?.replace(/\s+/g, '')).toMatch(/^\d{6}$/)
})
