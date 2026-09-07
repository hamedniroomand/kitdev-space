import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts color formats', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/converter')

  await test.step('displays default converted color formats', async () => {
    await expect(page.getByText('HEX', { exact: true })).toBeVisible()
    await expect(page.getByText('#7c3aed').first()).toBeVisible()
  })

  await test.step('converts user-provided color', async () => {
    const colorInput = page.getByRole('textbox', { name: 'Color' })
    await colorInput.fill('#ff0000')
    await page.getByRole('button', { name: 'Convert' }).click()

    await expect(page.getByText('#ff0000').first()).toBeVisible()
    await expect(page.getByText('rgb(255, 0, 0)')).toBeVisible()
  })

  await test.step('clears color and conversion results', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    const colorInput = page.getByRole('textbox', { name: 'Color' })
    await expect(colorInput).toHaveValue('')
    await expect(page.getByText('HEX', { exact: true })).not.toBeVisible()
  })
})
