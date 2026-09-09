import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('benchmarks password hashing algorithms', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/password-benchmark')

  await page.getByRole('button', { name: 'Load Sample' }).click()
  await expect(page.getByPlaceholder('Enter a sample password')).not.toHaveValue('')

  await page.getByRole('button', { name: 'Benchmark' }).click()

  await expect(page.getByText(/Duration/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Verified/)).toBeVisible()
  await expect(page.getByText('Each repetition')).toBeVisible()
})
