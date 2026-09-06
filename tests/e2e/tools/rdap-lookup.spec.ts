import { expect, test } from '@playwright/test'
import rdapFixture from '../fixtures/rdap.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('RDAP Lookup tool', () => {
  test('looks up domain registration info with mock response', async ({ page }) => {
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

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('MarkMonitor Inc.')).not.toBeVisible()
  })
})
