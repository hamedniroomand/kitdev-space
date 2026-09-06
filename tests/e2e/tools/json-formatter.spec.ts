import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('formats JSON on the JSON Formatter page', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toBeVisible()
  await input.fill('{"name":"KitDev","ready":true}')
  await page.getByRole('button', { name: 'Format' }).click()

  await expect(page.getByText('Valid JSON')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('"name": "KitDev"')
})
