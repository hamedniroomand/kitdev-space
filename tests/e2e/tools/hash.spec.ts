import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('generates cryptographic hash', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/hash-generator')

  await fillCodeMirror(page, 'Input', 'hello')
  await page.getByRole('button', { name: 'Hash' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')

  await test.step('compares the output with an expected hash', async () => {
    const field = page.getByRole('textbox', { name: 'Expected hash (optional)' })
    await field.fill('2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824')
    await expect(page.getByText('Match', { exact: true })).toBeVisible()

    await field.fill('0000000000000000000000000000000000000000000000000000000000000000')
    await expect(page.getByText('Mismatch', { exact: true })).toBeVisible()
  })
})
