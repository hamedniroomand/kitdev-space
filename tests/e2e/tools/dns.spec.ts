import { expect, test } from '@playwright/test'
import dnsFixture from '../fixtures/dns.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test('looks up DNS A records for example.com with mock response', async ({ page }) => {
  await page.route('/api/network/dns', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dnsFixture),
    })
  })

  await gotoHydrated(page, '/hub/network/dns-lookup')

  await page.getByLabel('Domain').fill('example.com')
  await page.getByRole('button', { name: 'Lookup' }).click()

  await expect(page.getByText('93.184.216.34').first()).toBeVisible()
})
