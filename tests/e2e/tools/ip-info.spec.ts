import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('IP Address Info tool', () => {
  test('looks up IP information and handles presets with mock response', async ({ page }) => {
    await page.route('**/api/network/ip-info*', async (route) => {
      const url = new URL(route.request().url())
      const ip = url.searchParams.get('ip') || '1.1.1.1'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ip,
          version: 4,
          type: 'public',
          isSpecial: false,
          hostname: 'one.one.one.one',
          decimal: 16843009,
          hex: '0x01010101',
          binary: '00000001.00000001.00000001.00000001',
        }),
      })
    })

    await gotoHydrated(page, '/hub/network/ip-info')

    // Click Cloudflare DNS preset to trigger client fetch
    await page.locator('main').getByRole('button', { name: 'Cloudflare DNS' }).click()

    await expect(page.locator('main').getByTitle('one.one.one.one')).toBeVisible()
    await expect(page.locator('main').getByText('16843009', { exact: false })).toBeVisible()

    // Test Google DNS preset click
    await page.locator('main').getByRole('button', { name: 'Google DNS' }).click()
    await expect(page.locator('main').getByText('8.8.8.8', { exact: true })).toBeVisible()
  })
})
