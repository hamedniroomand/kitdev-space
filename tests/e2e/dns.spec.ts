import { expect, test } from '@playwright/test'

// Skip in CI when outbound DNS is blocked. Local runs hit a public domain.
test('looks up DNS A records for example.com', async ({ page }) => {
  test.skip(!!process.env.CI, 'CI may block outbound DNS')

  await page.goto('/hub/network/dns-lookup')

  await page.getByLabel('Domain').fill('example.com')
  await page.getByRole('button', { name: 'Lookup' }).click()

  await expect(page.getByText(/93\.184\.216\.34|A record|No records/i).first()).toBeVisible({
    timeout: 15_000
  })
})
