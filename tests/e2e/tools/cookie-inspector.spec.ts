import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Cookie Inspector tool', () => {
  test('inspects cookies and security findings live', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/cookie-inspector')

    // Initial sample renders set-cookies
    await expect(page.locator('main').getByText('session', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('theme', { exact: true })).toBeVisible()

    // Test clicking a preset
    await page.locator('main').getByRole('button', { name: 'Secure session cookie' }).click()
    await expect(page.locator('main').getByText('sid', { exact: true })).toBeVisible()

    // Test clearing. An empty input renders no report at all. The
    // "No cookie found." notice needs input that parses to no cookie, which
    // an empty box is not.
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('sid', { exact: true })).not.toBeVisible()
    await expect(page.locator('main').getByText('session', { exact: true })).not.toBeVisible()
  })
})
