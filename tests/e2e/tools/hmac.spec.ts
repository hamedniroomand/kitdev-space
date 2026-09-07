import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('computes HMAC signature', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/hmac')

  const signature = page.locator('main div.font-mono.select-all span')

  await test.step('computes default SHA-256 hex signature', async () => {
    await expect(signature).toBeVisible()
    const sigText = (await signature.textContent()) ?? ''
    expect(sigText).toMatch(/^[0-9a-f]{64}$/i)
  })

  await test.step('switches to SHA-512 algorithm', async () => {
    await page.getByRole('button', { name: 'SHA-512' }).click()
    const sigText = (await signature.textContent()) ?? ''
    expect(sigText).toMatch(/^[0-9a-f]{128}$/i)
  })

  await test.step('switches encoding to Base64', async () => {
    await page.getByRole('button', { name: 'Base64' }).click()
    const sigText = (await signature.textContent()) ?? ''
    expect(sigText).toMatch(/^[A-Z0-9+/=]+$/i)
  })

  await test.step('clears inputs and signature', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(signature).toHaveText(/Enter a secret key and a message/)
  })
})
