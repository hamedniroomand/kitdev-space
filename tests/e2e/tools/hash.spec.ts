import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('generates cryptographic hash', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/hash-generator')

  await fillCodeMirror(page, 'Input', 'hello')
  await page.getByRole('button', { name: 'Hash' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})
