import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates diceware passphrases', async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/passphrase')

  await page.getByRole('button', { name: 'Generate' }).click()

  const items = page.locator('main ul li')
  await expect(items.first()).toBeVisible()
  const text = await items.first().textContent()
  expect(text).toContain('-')
})
