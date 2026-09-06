import { expect, test } from '@playwright/test'
import ipInfoFixture from '../fixtures/ip-info.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('IP Address Info tool', () => {
  test('looks up IP information with mock response', async ({ page }) => {
    await page.route('/api/network/ip-info*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ipInfoFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/ip-info')

    // Click Cloudflare DNS preset to trigger client fetch
    await page.locator('main').getByRole('button', { name: 'Cloudflare DNS' }).click()

    await expect(page.locator('main').getByTitle('one.one.one.one')).toBeVisible()
    await expect(page.locator('main').getByText('16843009', { exact: false })).toBeVisible()
  })
})
