import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts numbers across bases', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/number-base')

  const decInput = page.locator('.p-4.rounded-xl').filter({ hasText: 'Decimal (Base 10)' }).getByRole('textbox')
  const hexInput = page.locator('.p-4.rounded-xl').filter({ hasText: 'Hexadecimal (Base 16)' }).getByRole('textbox')
  const binInput = page.locator('.p-4.rounded-xl').filter({ hasText: 'Binary (Base 2)' }).getByRole('textbox')
  const octInput = page.locator('.p-4.rounded-xl').filter({ hasText: 'Octal (Base 8)' }).getByRole('textbox')

  await test.step('applies preset value', async () => {
    await page.getByRole('button', { name: '255 (8-bit max)' }).click()
    await expect(decInput).toHaveValue('255')
    await expect(hexInput).toHaveValue('FF')
    await expect(binInput).toHaveValue('11111111')
    await expect(octInput).toHaveValue('377')
  })

  await test.step('updates all bases when typing decimal number', async () => {
    await decInput.fill('16')
    await expect(hexInput).toHaveValue('10')
    await expect(binInput).toHaveValue('10000')
    await expect(octInput).toHaveValue('20')
  })
})
