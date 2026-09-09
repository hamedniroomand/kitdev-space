import { expect, test } from '@playwright/test'
import ipInfoFixture from '../fixtures/ip-info.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('IP Address Info tool', () => {
  test('looks up IP information with mock response', { tag: '@smoke' }, async ({ page }) => {
    let calls = 0
    await page.route('/api/network/ip-info*', async (route) => {
      calls++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ipInfoFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/ip-info')

    // NET-38: the page starts no lookup, so the API gets no request on load.
    expect(calls).toBe(0)

    // Click Cloudflare DNS preset to trigger client fetch
    await page.locator('main').getByRole('button', { name: 'Cloudflare DNS' }).click()

    // The hostname shows in the Reverse DNS stat card and in the details table,
    // so scope to the card.
    await expect(page.getByLabel('Reverse DNS').getByText('one.one.one.one')).toBeVisible()
    await expect(page.locator('main').getByText('16843009').first()).toBeVisible()

    // NET-39: the shared result actions give Copy JSON.
    await expect(page.locator('main').getByRole('button', { name: 'Copy JSON result to clipboard' })).toBeVisible()

    // NET-37: the deep links carry the address to the related tools.
    await expect(page.locator('main').getByRole('link', { name: 'Lookup in RDAP' }))
      .toHaveAttribute('href', `/hub/network/rdap-lookup?query=${encodeURIComponent(ipInfoFixture.ip)}`)
    await expect(page.locator('main').getByRole('link', { name: 'Inspect Subnet in CIDR' }))
      .toHaveAttribute('href', `/hub/network/cidr?ip=${encodeURIComponent(ipInfoFixture.ip)}`)
  })

  // NET-39: a shared link carries the address in `?ip=`. It fills the field and
  // starts no lookup.
  test('fills the address field from the ip query parameter', async ({ page }) => {
    await gotoHydrated(page, '/hub/network/ip-info?ip=9.9.9.9')

    await expect(page.locator('main').getByRole('textbox')).toHaveValue('9.9.9.9')
  })
})
