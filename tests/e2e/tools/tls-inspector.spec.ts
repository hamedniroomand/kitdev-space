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

    await expect(page.locator('main').getByText('75 days', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Matches Hostname', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('*.google.com').first()).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('75 days')).not.toBeVisible()
  })
})
