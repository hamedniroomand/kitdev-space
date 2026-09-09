import { expect, test } from '@playwright/test'
import rdapFixture from '../fixtures/rdap.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('RDAP Lookup tool', () => {
  test('looks up domain registration info with mock response', { tag: '@smoke' }, async ({ page }) => {
    await page.route('/api/network/rdap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(rdapFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/rdap-lookup')

    await page.locator('main').getByRole('button', { name: 'Lookup' }).click()

    await expect(page.locator('main').getByText('Registered', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('MarkMonitor Inc.', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('760 days', { exact: true })).toBeVisible()

    // Each EPP status code carries a plain English sentence.
    await expect(
      page.locator('main').getByText('The registrar blocks a transfer of the domain to a different registrar.'),
    ).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('MarkMonitor Inc.')).not.toBeVisible()
  })

  test('reports the query source, the privacy redaction, and a near expiry', async ({ page }) => {
    await page.route('/api/network/rdap', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            query: 'thin.com',
            type: 'domain',
            found: true,
            status: ['clientTransferProhibited'],
            expirationDate: '2030-01-01T00:00:00.000Z',
            daysUntilExpiration: 12,
            registrar: { ianaId: '292' },
            redactedFields: ['Name', 'Registrant Email'],
            nameservers: [],
            server: 'https://rdap.verisign.com/com/v1/domain/thin.com',
            queriedAt: '2030-01-01T10:20:30.000Z',
            durationMs: 120,
            referrals: ['https://rdap.registrar.example/domain/thin.com'],
            raw: { objectClassName: 'domain' },
          },
        }),
      })
    })

    await gotoHydrated(page, '/hub/network/rdap-lookup')
    await page.locator('main').getByRole('button', { name: 'Lookup' }).click()

    await expect(page.locator('main').getByText('The domain expires soon')).toBeVisible()
    await expect(page.locator('main').getByText('Hidden for privacy', { exact: true })).toBeVisible()
    await expect(
      page.locator('main').getByText('https://rdap.verisign.com/com/v1/domain/thin.com'),
    ).toBeVisible()
    await expect(
      page.locator('main').getByText('https://rdap.registrar.example/domain/thin.com'),
    ).toBeVisible()
  })
})
