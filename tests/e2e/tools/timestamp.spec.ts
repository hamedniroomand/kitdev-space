import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Timestamp Studio tool', () => {
  test('parses timestamps and converts between ISO and Unix epoch', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/timestamp')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Test epoch 0
    const input = page.locator('main').getByPlaceholder('e.g. 1700000000 or 2024-01-01T00:00:00Z')
    await input.fill('0')

    await expect(page.locator('main').getByText('1970-01-01T00:00:00.000Z')).toBeVisible()

    // Click Set Now button
    await page.getByRole('button', { name: 'Set Now' }).click()
    await expect(input).not.toHaveValue('0')

    // Click Clear
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(input).toHaveValue('')
  })

  test('keeps nanosecond digits and warns about an ambiguous date', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/timestamp')

    const input = page.locator('main').getByPlaceholder('e.g. 1700000000 or 2024-01-01T00:00:00Z')

    await input.fill('1700000000123456789')
    await expect(page.locator('main').getByText('2023-11-14T22:13:20.123456789Z')).toBeVisible()

    await input.fill('01/02/2024')
    await expect(page.locator('main').getByText('The date order is ambiguous')).toBeVisible()
  })
})
