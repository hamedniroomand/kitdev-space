import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

const summary = {
  result: {
    domain: 'example.com',
    resolver: '1.1.1.1',
    elapsedMs: 24,
    status: 'ok',
    message: '',
    answers: [
      {
        type: 'A',
        status: 'ok',
        message: '',
        records: [{ type: 'A', value: '93.184.216.34', ttl: 300 }],
      },
      {
        type: 'CAA',
        status: 'ok',
        message: '',
        records: [{ type: 'CAA', value: '0 issue "letsencrypt.org"', ttl: null }],
      },
      {
        type: 'CNAME',
        status: 'nodata',
        message: 'The domain has no CNAME record.',
        records: [],
      },
    ],
  },
}

test('looks up DNS records for example.com with mock response', { tag: '@smoke' }, async ({ page }) => {
  await page.route('/api/network/dns', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    })
  })

  await gotoHydrated(page, '/hub/network/dns-lookup')

  await page.getByLabel('Domain').fill('example.com')
  await page.getByRole('button', { name: 'Lookup', exact: true }).click()

  // NET-01: one request returns every record type in one table.
  await expect(page.getByText('93.184.216.34').first()).toBeVisible()
  await expect(page.getByText('0 issue "letsencrypt.org"')).toBeVisible()

  // NET-02: TTL, query time, and the resolver of the server.
  await expect(page.getByText('300s')).toBeVisible()
  await expect(page.getByText('1.1.1.1')).toBeVisible()

  // NET-03: a missing record type is not a failure.
  await expect(page.getByText('The domain has no CNAME record.')).toBeVisible()

  // NET-05: the shared result actions and the dig command.
  await expect(page.getByRole('button', { name: 'Download JSON result file' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy dig command', exact: true })).toBeVisible()
})
