import { expect, test } from '@playwright/test'
import ogPreviewFixture from '../fixtures/og-preview.json' with { type: 'json' }
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('Open Graph Preview tool', () => {
  test('previews Open Graph cards with mock response', { tag: '@smoke' }, async ({ page }) => {
    await page.route('/api/network/og-preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ogPreviewFixture),
      })
    })

    await gotoHydrated(page, '/hub/network/og-preview')

    // The User-Agent selector belongs to the URL mode.
    await expect(page.locator('main').getByText('User-Agent', { exact: true })).toBeVisible()

    const input = page.locator('main').getByPlaceholder('https://example.com')
    await input.fill('https://example.com/post/1')
    await page.locator('main').getByRole('button', { name: 'Preview' }).click()

    await expect(page.locator('main').getByText('Sample OpenGraph Title').first()).toBeVisible()
    await expect(page.locator('main').getByText('Example Portal').first()).toBeVisible()

    // The tag checklist and the corrected meta tags come with the result.
    await expect(page.locator('main').getByRole('heading', { name: 'Tag checklist' })).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Copy corrected meta tags' })).toBeVisible()

    // Test clear
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('Sample OpenGraph Title')).not.toBeVisible()
  })

  test('reads pasted HTML in the browser', async ({ page }) => {
    let serverCalls = 0
    await page.route('/api/network/og-preview', async (route) => {
      serverCalls += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await gotoHydrated(page, '/hub/network/og-preview')

    await page.locator('main').getByRole('tab', { name: 'Paste HTML' }).click()
    await expect(page.locator('main').getByText('The pasted HTML stays in your browser')).toBeVisible()

    await fillCodeMirror(page, 'HTML', '<html><head><meta property="og:title" content="Draft Page Title"></head></html>')
    await page.locator('main').getByRole('button', { name: 'Preview' }).click()

    await expect(page.locator('main').getByText('Draft Page Title').first()).toBeVisible()
    expect(serverCalls).toBe(0)
  })
})
