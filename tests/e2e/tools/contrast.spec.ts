import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('checks color contrast ratio and WCAG rating', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/contrast-checker')

  await test.step('displays initial contrast ratio', async () => {
    await expect(page.getByText('Normal text', { exact: true })).toBeVisible()
    await expect(page.getByText('Large text', { exact: true })).toBeVisible()
    await expect(page.getByText('5.70:1', { exact: true })).toBeVisible()
  })

  await test.step('recalculates ratio when colors change', async () => {
    await page.getByRole('textbox', { name: 'Text' }).fill('#000000')
    await page.getByRole('textbox', { name: 'Background' }).fill('#ffffff')
    await page.getByRole('button', { name: 'Check' }).click()

    await expect(page.getByText('21.00:1', { exact: true })).toBeVisible()
  })

  await test.step('clears results', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText('21.00:1', { exact: true })).not.toBeVisible()
  })
})
