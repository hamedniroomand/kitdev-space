import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('RDAP Lookup tool', () => {
  test('looks up domain registration info with mock response', async ({ page }) => {
    await page.route('**/api/network/rdap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            query: 'github.com',
            type: 'domain',
            found: true,
            registrationDate: '2007-10-09T18:20:50Z',
            expirationDate: '2028-10-09T18:20:50Z',
            daysUntilExpiration: 760,
            dnssec: true,
            registrar: {
              name: 'MarkMonitor Inc.',
              ianaId: '292',
              abuseEmail: 'abusecomplaints@markmonitor.com',
              abusePhone: '+1.2083895740',
            },
            status: ['clientDeleteProhibited', 'clientTransferProhibited'],
            nameservers: ['dns1.p08.nsone.net', 'dns2.p08.nsone.net'],
            raw: { objectClassName: 'domain', handle: 'github.com' },
          },
        }),
      })
    })

    await gotoHydrated(page, '/hub/network/rdap-lookup')

    await page.locator('main').getByRole('button', { name: 'Lookup' }).click()

    await expect(page.locator('main').getByText('Registered', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('MarkMonitor Inc.', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('760 days', { exact: true })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('MarkMonitor Inc.')).not.toBeVisible()
  })
})
