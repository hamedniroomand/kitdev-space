import { expect, test } from '@playwright/test'
import tlsFixture from '../fixtures/tls.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('TLS Certificate Inspector tool', () => {
  test('inspects TLS certificate details with mock response', { tag: '@smoke' }, async ({ page }) => {
    await page.route('/api/network/tls', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tlsFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/tls-inspector')

    await page.locator('main').getByRole('button', { name: 'Inspect Certificate' }).click()

    // Three independent checks, each with its own status.
    await expect(page.locator('main').getByRole('heading', { name: 'Trust Chain' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Hostname Match' })).toBeVisible()
    await expect(page.locator('main').getByRole('heading', { name: 'Validity Dates' })).toBeVisible()
    await expect(page.locator('main').getByText('The certificate covers google.com.')).toBeVisible()
    await expect(page.locator('main').getByText('75 days remain.')).toBeVisible()
    await expect(page.locator('main').getByText('*.google.com').first()).toBeVisible()

    // The chain shows the leaf first and flags the incomplete chain.
    await expect(page.locator('main').getByText('Leaf (server)')).toBeVisible()
    await expect(page.locator('main').getByText('Missing intermediate', { exact: true })).toBeVisible()

    // The negotiated cipher and the JSON download.
    await expect(page.locator('main').getByText('Negotiated Cipher', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Download JSON result file' })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('75 days remain.')).not.toBeVisible()
  })
})
