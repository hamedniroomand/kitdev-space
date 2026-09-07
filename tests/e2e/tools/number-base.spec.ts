import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts numbers across bases', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/number-base')

  const decCard = page.locator('div.rounded-xl').filter({ has: page.getByText('Decimal (Base 10)') })
  const hexCard = page.locator('div.rounded-xl').filter({ has: page.getByText('Hexadecimal (Base 16)') })
  const binCard = page.locator('div.rounded-xl').filter({ has: page.getByText('Binary (Base 2)') })
  const octCard = page.locator('div.rounded-xl').filter({ has: page.getByText('Octal (Base 8)') })

  const decInput = decCard.getByRole('textbox')
  const hexInput = hexCard.getByRole('textbox')
  const binInput = binCard.getByRole('textbox')
  const octInput = octCard.getByRole('textbox')

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
