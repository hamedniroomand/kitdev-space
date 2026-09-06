import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('encrypts text using AES-GCM', async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/aes')

  await fillCodeMirror(page, 'Plaintext Input', 'Secret payload message')
  await page.getByRole('button', { name: 'Encrypt Text (AES-GCM)' }).click()

  const output = page.getByRole('textbox', { name: 'Encrypted Ciphertext (Base64)' })
  await expect(output).not.toBeEmpty()
  const ciphertext = await output.textContent()
  expect(ciphertext?.trim().length).toBeGreaterThan(20)
})
