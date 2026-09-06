import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('URL Inspector tool', () => {
  test('inspects URL components and handles clear', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/url-inspector')

    // Initial input is pre-filled: https://user:pass@example.com:8443/path?q=1#top
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.locator('main').getByText('8443', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('example.com', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('/path', { exact: true })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('8443', { exact: true })).not.toBeVisible()
  })
})
