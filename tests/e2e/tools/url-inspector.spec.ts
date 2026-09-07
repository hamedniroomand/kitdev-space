import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('URL Inspector tool', () => {
  test('inspects URL components and handles clear', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/url-inspector')

    const urlInput = page.getByRole('textbox', { name: 'URL' })

    await test.step('inspects default sample URL', async () => {
      await page.locator('main').getByRole('button', { name: 'Inspect' }).click()
      await expect(page.locator('main').getByText('8443', { exact: true })).toBeVisible()
      await expect(page.locator('main').getByText('example.com', { exact: true })).toBeVisible()
      await expect(page.locator('main').getByText('/path', { exact: true })).toBeVisible()
    })

    await test.step('inspects custom URL with port and query parameters', async () => {
      await urlInput.fill('https://kitdev.org:9000/api/test?foo=bar')
      await page.locator('main').getByRole('button', { name: 'Inspect' }).click()
      await expect(page.locator('main').getByText('9000', { exact: true })).toBeVisible()
      await expect(page.locator('main').getByText('kitdev.org', { exact: true })).toBeVisible()
      await expect(page.locator('main').getByText('/api/test', { exact: true })).toBeVisible()
    })

    await test.step('clears URL and parsed components', async () => {
      await page.locator('main').getByRole('button', { name: 'Clear' }).click()
      await expect(urlInput).toHaveValue('')
      await expect(page.locator('main').getByText('9000', { exact: true })).not.toBeVisible()
    })
  })
})
