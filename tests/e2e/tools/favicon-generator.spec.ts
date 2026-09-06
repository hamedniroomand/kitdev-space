import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Favicon Set Generator tool', () => {
  test('loads sample logo and generates favicon package with mock response', { tag: '@smoke' }, async ({ page }) => {
    await page.route('**/api/image/favicon-generator', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            zipBase64: 'UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==',
            htmlSnippet: '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
            webmanifest: '{\n  "name": "My Application"\n}',
            previews: [
              {
                name: 'favicon-32x32.png',
                size: 32,
                dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              },
            ],
          },
        }),
      })
    })

    await gotoHydrated(page, '/hub/image/favicon-generator')

    await expect(page.getByRole('heading', { name: /Favicon/, level: 1 })).toBeVisible()

    // Click Load Sample Logo
    await page.getByRole('button', { name: 'Load Sample Logo' }).click()

    // Click Generate Favicon Set
    await page.getByRole('button', { name: 'Generate Favicon Set' }).click()

    // Verify results sections
    await expect(page.locator('main').getByText('Favicon Package Ready')).toBeVisible()
    await expect(page.locator('main').getByText('Download Package (.ZIP)')).toBeVisible()
    await expect(page.locator('main').getByText('favicon-32x32.png')).toBeVisible()
  })
})
