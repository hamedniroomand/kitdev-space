import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('benchmarks password hashing algorithms', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/password-benchmark')

  await page.getByPlaceholder('Enter a sample password').fill('TestPass123!')
  await page.getByRole('button', { name: 'Benchmark' }).click()

  await expect(page.getByText(/Duration/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Verified/)).toBeVisible()
})
