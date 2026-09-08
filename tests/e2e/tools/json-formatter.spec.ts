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

test('switches to tree view and copies path on node click', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const input = page.getByRole('textbox', { name: 'Input' })
  await input.fill('{"user":{"name":"Alice"}}')
  await page.getByRole('button', { name: 'Format' }).click()

  await expect(page.getByText('Valid JSON')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Tree View' }).click()

  const node = page.locator('[data-path="$.user.name"]')
  await expect(node).toBeVisible()
  await node.click()

  await expect(page.getByText('Copied path: $.user.name')).toBeVisible()
})
