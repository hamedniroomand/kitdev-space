import { expect, test } from '@playwright/test'
import emailHealthFixture from '../fixtures/email-health.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('Email Health Inspector tool', () => {
  test('inspects SPF, DKIM, DMARC, and MX records with mock response', { tag: '@smoke' }, async ({ page }) => {
    // Mock the DNS email-health endpoint
    await page.route('/api/network/dns', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emailHealthFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/email-health')

    const domainInput = page.locator('main').getByPlaceholder('example.com')
    await domainInput.fill('example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    // The fixture's SPF is `v=spf1 -all`, which authorizes no sender, so the
    // tool reports a warning rather than a clean result.
    await expect(
      page.locator('main').getByText('SPF has no authorizing mechanisms', { exact: false }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('main').getByText('DMARC record looks valid.')).toBeVisible()
    await expect(page.locator('main').getByText('mail.example.com')).toBeVisible()
  })
})
