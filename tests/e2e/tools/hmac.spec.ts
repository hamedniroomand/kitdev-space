import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('computes HMAC signature', async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/hmac')

  const signature = page.locator('main div.font-mono.select-all span')
  await expect(signature).toBeVisible()
  const sigText = await signature.textContent()
  expect(sigText).toMatch(/^[0-9a-f]{64}$/i)
})
