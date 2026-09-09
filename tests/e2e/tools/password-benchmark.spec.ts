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

  await test.step('checks the password against the hash of the run', async () => {
    const hash = ((await page.locator('dl div').filter({ hasText: 'Hash' }).locator('dd').textContent()) ?? '').trim()

    // The password matches SAMPLE.password in app/pages/hub/crypto/password-benchmark.vue.
    await page.getByPlaceholder('Enter the password to check').fill('correct-horse-battery-staple')
    await page.getByPlaceholder('$2b$10$...').fill(hash)
    await page.getByRole('button', { name: 'Check hash' }).click()

    await expect(page.getByText('The password matches the hash.')).toBeVisible({ timeout: 10_000 })
  })
})
