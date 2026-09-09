import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Favicon Set Generator tool', () => {
  test('loads sample logo and generates the favicon package in the browser', { tag: '@smoke' }, async ({ page }) => {
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
