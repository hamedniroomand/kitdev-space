import { expect, test } from '@playwright/test'
import httpInspectorFixture from '../fixtures/http-inspector.json' with { type: 'json' }
import { gotoHydrated } from '../utils'

test.describe('HTTP Inspector tool', () => {
  test('inspects headers and security policy with mock response', async ({ page }) => {
    // Mock the HTTP inspect API endpoint
    await page.route('/api/network/headers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(httpInspectorFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/http-inspector')

    const input = page.locator('main').getByPlaceholder('https://example.com')
    await input.fill('https://example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.locator('main').getByText('85/100 · Grade B')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('main').getByText('Content Security Policy missing')).toBeVisible()

    // Switch to Headers tab
    await page.locator('main').getByRole('tab', { name: 'Headers' }).click()
    await expect(page.locator('main').getByText('text/html; charset=utf-8')).toBeVisible()

    // Switch to Redirects tab
    await page.locator('main').getByRole('tab', { name: 'Redirects' }).click()
    await expect(page.locator('main').getByRole('cell', { name: 'https://example.com' })).toBeVisible()
  })
})
