import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Open Graph Preview tool', () => {
  test('previews Open Graph cards with mock response', async ({ page }) => {
    await page.route('**/api/network/og-preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            title: 'Sample OpenGraph Title',
            description: 'Sample description of the page for testing preview.',
            image: 'https://example.com/og.png',
            url: 'https://example.com/post/1',
            siteName: 'Example Portal',
            twitterCard: 'summary_large_image'
          }
        })
      })
    })

    await gotoHydrated(page, '/hub/network/og-preview')

    const input = page.locator('main').getByPlaceholder('https://example.com')
    await input.fill('https://example.com/post/1')
    await page.locator('main').getByRole('button', { name: 'Preview' }).click()

    await expect(page.locator('main').getByText('Sample OpenGraph Title').first()).toBeVisible()
    await expect(page.locator('main').getByText('Example Portal').first()).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('Sample OpenGraph Title')).not.toBeVisible()
  })
})
