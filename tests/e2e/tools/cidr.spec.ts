import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('CIDR Calculator tool', () => {
  test('calculates subnet details and handles presets', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/cidr')

    // Initial value is 192.168.1.0/24
    await expect(page.locator('main').getByText('254', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('192.168.1.1', { exact: true })).toBeVisible()

    // Test a preset
    await page.locator('main').getByRole('button', { name: 'VPC Subnet (/20)' }).click()
    await expect(page.locator('main').getByText('4,094', { exact: false })).toBeVisible()
    await expect(page.locator('main').getByText('10.0.0.1', { exact: true })).toBeVisible()

    // Test invalid input
    const input = page.locator('main').getByPlaceholder('e.g. 192.168.1.0/24')
    await input.fill('invalid/99')
    await expect(
      page.locator('main').getByText('Prefix length must be between 0 and 32.'),
    ).toBeVisible()
  })
})
