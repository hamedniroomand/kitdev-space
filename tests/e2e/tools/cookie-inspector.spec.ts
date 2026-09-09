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

  test('checks delivery to a request URL and masks values by default', async ({ page }) => {
    await gotoHydrated(page, '/hub/network/cookie-inspector')

    await page.locator('main').getByRole('button', { name: 'Secure session cookie' }).click()
    await page.getByRole('textbox', { name: 'Request URL' }).fill('http://example.com/')

    // The cookie has Secure, so the browser does not send it over plain HTTP.
    await expect(page.locator('main').getByText('Secure over HTTP')).toBeVisible()

    // A same-site request passes SameSite=Strict, a cross-site request does not.
    await expect(page.locator('main').getByText('SameSite=Strict.')).toHaveCount(0)
    await page.getByRole('combobox', { name: 'Request context' }).click()
    await page.getByRole('option', { name: 'Cross-site subresource or POST' }).click()
    await expect(page.locator('main').getByText('SameSite=Strict.')).toBeVisible()

    await expect(page.getByRole('switch', { name: 'Mask values in JSON' })).toBeChecked()
  })
})
