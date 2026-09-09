import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('converts color formats', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/converter')

  await test.step('displays default converted color formats', async () => {
    await expect(page.getByText('HEX', { exact: true })).toBeVisible()
    await expect(page.getByText('#7c3aed').first()).toBeVisible()
  })

  await test.step('displays channel values and gamut badges', async () => {
    await expect(page.getByText('sRGB', { exact: true })).toBeVisible()
    await expect(page.getByText('sRGB: inside', { exact: true })).toBeVisible()
    await expect(page.getByText('Display P3: inside', { exact: true })).toBeVisible()
  })

  await test.step('converts user-provided color', async () => {
    const colorInput = page.getByRole('textbox', { name: 'Color' })
    await colorInput.fill('#ff0000')
    await page.getByRole('button', { name: 'Convert' }).click()

    await expect(page.getByText('#ff0000').first()).toBeVisible()
    await expect(page.getByText('rgb(255, 0, 0)')).toBeVisible()
  })

  await test.step('warns when a color is outside the sRGB gamut', async () => {
    const colorInput = page.getByRole('textbox', { name: 'Color' })
    await colorInput.fill('oklch(86.6% 0.295 142.5)')
    await page.getByRole('button', { name: 'Convert' }).click()

    await expect(page.getByText('sRGB: outside', { exact: true })).toBeVisible()
    await expect(page.getByText('Outside the sRGB gamut', { exact: true })).toBeVisible()
  })

  await test.step('clears color and conversion results', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    const colorInput = page.getByRole('textbox', { name: 'Color' })
    await expect(colorInput).toHaveValue('')
    await expect(page.getByText('HEX', { exact: true })).not.toBeVisible()
  })
})

test('redirects the merged color inspector route', async ({ page }) => {
  await page.goto('/hub/color/inspector')
  await expect(page).toHaveURL(/\/hub\/color\/converter$/)
})
