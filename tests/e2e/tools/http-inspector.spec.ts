import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('HTTP Inspector tool', () => {
  test('inspects headers and security policy with mock response', async ({ page }) => {
    // Mock the HTTP inspect API endpoint
    await page.route('**/api/network/headers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            status: 200,
            statusText: 'OK',
            headers: {
              'content-type': 'text/html; charset=utf-8',
              'x-frame-options': 'DENY'
            },
            url: 'https://example.com',
            hops: [
              { url: 'https://example.com', status: 200 }
            ],
            security: {
              score: 85,
              grade: 'B',
              cors: {
                allowOrigin: '*',
                allowMethods: 'GET, POST',
                allowHeaders: 'Content-Type',
                allowCredentials: 'false',
                exposeHeaders: '',
                maxAge: '86400'
              },
              findings: [
                {
                  id: 'csp-missing',
                  header: 'Content-Security-Policy',
                  title: 'Content Security Policy missing',
                  level: 'warning',
                  detail: 'No CSP header found.',
                  fix: 'Add a Content-Security-Policy header.'
                }
              ]
            }
          }
        })
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
