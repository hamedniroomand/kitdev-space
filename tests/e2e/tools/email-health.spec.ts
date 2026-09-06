import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Email Health Inspector tool', () => {
  test('inspects SPF, DKIM, DMARC, and MX records with mock response', async ({ page }) => {
    // Mock the DNS email-health endpoint
    await page.route('**/api/network/dns', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            domain: 'example.com',
            spf: {
              raw: ['v=spf1 include:_spf.example.com ~all'],
              mechanisms: [{ raw: 'include:_spf.example.com' }, { raw: '~all' }],
              issues: [{ code: 'spf-valid', level: 'ok', message: 'Valid SPF record found.' }],
            },
            dkim: {
              issues: [{ code: 'dkim-ok', level: 'ok', message: 'DKIM verified.' }],
              selectors: [
                { selector: 'default', present: true, issues: [] },
              ],
            },
            dmarc: {
              raw: ['v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@example.com'],
              present: true,
              policy: 'reject',
              subdomainPolicy: 'reject',
              percent: 100,
              aggregateReportUris: ['mailto:dmarc@example.com'],
              issues: [{ code: 'dmarc-reject', level: 'ok', message: 'Enforcing reject policy.' }],
            },
            mx: {
              records: [
                { priority: 10, exchange: 'mail.example.com', issues: [] },
              ],
              issues: [{ code: 'mx-found', level: 'ok', message: 'MX record found.' }],
            },
          },
        }),
      })
    })

    await gotoHydrated(page, '/hub/network/email-health')

    const domainInput = page.locator('main').getByPlaceholder('example.com')
    await domainInput.fill('example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.locator('main').getByText('Valid SPF record found.')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('main').getByText('Enforcing reject policy.')).toBeVisible()
    await expect(page.locator('main').getByText('mail.example.com')).toBeVisible()
  })
})
