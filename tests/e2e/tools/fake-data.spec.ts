import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates mock data in multiple formats', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/fake-generator')

  await expect(page.getByRole('heading', { name: /Schema Fields/ })).toBeVisible()
  const output = page.locator('.cm-content').last()
  await expect(output).toBeVisible({ timeout: 10_000 })
  await expect(output).toContainText('"email"')

  await page.getByRole('button', { name: 'SQL Inserts' }).click()
  await expect(output).toContainText('INSERT INTO')
})
