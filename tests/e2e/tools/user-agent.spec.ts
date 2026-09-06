import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('User Agent Parser tool', () => {
  test('parses browser user agent string and handles presets', async ({ page }) => {
    await gotoHydrated(page, '/hub/network/user-agent')

    const textarea = page.locator('main').getByPlaceholder('Paste user agent string here...')
    // Wait for onMounted to populate navigator.userAgent
    await expect(textarea).not.toHaveValue('', { timeout: 10_000 })

    // Click Chrome on macOS preset
    await page.locator('main').getByRole('button', { name: 'Chrome on macOS' }).click()

    // Assert parsed components
    await expect(page.locator('main').getByText('macOS', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Blink', { exact: true })).toBeVisible()

    // Click Googlebot preset
    await page.locator('main').getByRole('button', { name: 'Googlebot' }).click()
    await expect(page.locator('main').getByText('Bot / Crawler', { exact: true })).toBeVisible()

    // Clear input
    await page.locator('main').getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('Parsed Components')).not.toBeVisible()
  })
})
