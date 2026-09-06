import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('TLS Certificate Inspector tool', () => {
  test('inspects TLS certificate details with mock response', async ({ page }) => {
    await page.route('**/api/network/tls', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            host: 'google.com',
            port: 443,
            status: 'valid',
            daysRemaining: 75,
            validFrom: '2026-01-01T00:00:00.000Z',
            validTo: '2026-12-31T23:59:59.000Z',
            matchesHost: true,
            isSelfSigned: false,
            protocol: 'TLSv1.3',
            cipher: { name: 'TLS_AES_256_GCM_SHA384' },
            subject: {
              commonName: '*.google.com',
              organization: 'Google LLC',
              country: 'US',
            },
            issuer: {
              commonName: 'GTS CA 1C3',
              organization: 'Google Trust Services LLC',
              country: 'US',
            },
            serialNumber: '34829384920384',
            fingerprint256: 'AB:CD:EF:01:23:45',
            sans: ['*.google.com', 'google.com'],
            chain: [
              {
                subject: { commonName: '*.google.com' },
                issuer: { commonName: 'GTS CA 1C3' },
                validTo: '2026-12-31T23:59:59.000Z',
              },
            ],
          },
        }),
      })
    })

    await gotoHydrated(page, '/hub/network/tls-inspector')

    await page.locator('main').getByRole('button', { name: 'Inspect Certificate' }).click()

    await expect(page.locator('main').getByText('75 days', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Matches Hostname', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('*.google.com').first()).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('75 days')).not.toBeVisible()
  })
})
