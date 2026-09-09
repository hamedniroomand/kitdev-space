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

    // Platform mockups
    await expect(page.locator('main').getByText('Browser tab', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('iOS home screen', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Android launcher', { exact: true })).toBeVisible()
    await expect(page.getByAltText('iOS home screen icon preview')).toBeVisible()
  })

  test('shows the padding background field for contain fit only', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/favicon-generator')

    const padColor = page.getByLabel('Padding background color picker')
    await expect(padColor).toBeVisible()

    await page.getByRole('tab', { name: 'Cover crop' }).click()
    await expect(padColor).toBeHidden()

    await page.getByRole('tab', { name: 'Contain with padding' }).click()
    await expect(padColor).toBeVisible()
  })
})
