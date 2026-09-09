import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('User Agent Parser tool', () => {
  test('parses browser user agent string and handles presets', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/user-agent')

    const textarea = page.locator('main').getByPlaceholder('Paste user agent string here...')
    // Wait for onMounted to populate navigator.userAgent
    await expect(textarea).not.toHaveValue('', { timeout: 10_000 })

    // The local browser shows Client Hints and the structured export
    await expect(page.locator('main').getByText('Client Hints of this browser')).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Copy JSON result to clipboard' })).toBeVisible()

    // Click Chrome on macOS preset
    await page.locator('main').getByRole('button', { name: 'Chrome on macOS' }).click()

    // Client Hints belong to the local browser only
    await expect(page.locator('main').getByText('Client Hints of this browser')).toBeHidden()

    // Assert parsed components
    await expect(page.locator('main').getByText('macOS', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText(/^Blink/)).toBeVisible()

    // Click Googlebot preset
    await page.locator('main').getByRole('button', { name: 'Googlebot' }).click()
    await expect(page.locator('main').getByText('Bot / Crawler', { exact: true })).toBeVisible()

    // A non-browser client keeps its own name, never a guessed browser
    await textarea.fill('Go-http-client/2.0')
    await expect(page.locator('main').getByText('Go-http-client', { exact: true }).first()).toBeVisible()

    // Clear input
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('Parsed Components')).not.toBeVisible()
  })
})
