import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

function fieldRow(page: Page, name: string) {
  // The `has` locator is re-rooted at each row, so it must start from `page`.
  // A `main`-rooted one would look for a `<main>` inside the row and find none.
  return page.locator('main').getByRole('row').filter({
    has: page.getByRole('cell', { name, exact: true }),
  })
}

test.describe('URL Inspector tool', () => {
  test('inspects URL components and handles clear', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/network/url-inspector')

    const main = page.locator('main')
    const urlInput = main.getByRole('textbox', { name: 'URL', exact: true })

    await test.step('inspects default sample URL', async () => {
      await main.getByRole('button', { name: 'Inspect' }).click()
      await expect(fieldRow(page, 'port')).toContainText('8443')
      await expect(fieldRow(page, 'hostname')).toContainText('example.com')
      await expect(fieldRow(page, 'pathname')).toContainText('/path')
    })

    await test.step('keeps duplicate keys as separate rows with raw and decoded values', async () => {
      await expect(main.getByRole('textbox', { name: 'Parameter 1 key' })).toHaveValue('q')
      await expect(main.getByRole('textbox', { name: 'Parameter 2 key' })).toHaveValue('q')
      await expect(main.getByRole('textbox', { name: 'Parameter 1 value' })).toHaveValue('hello world')
      await expect(main.getByText('hello+world', { exact: true })).toBeVisible()
    })

    await test.step('rebuilds the URL after an edit and a move', async () => {
      await main.getByRole('textbox', { name: 'Parameter 2 value' }).fill('3')
      await expect(fieldRow(page, 'search')).toContainText('q=hello+world&q=3')
      await main.getByRole('button', { name: 'Move parameter 1 down' }).click()
      await expect(fieldRow(page, 'search')).toContainText('q=3&q=hello+world')
    })

    await test.step('masks credentials and reveals them on request', async () => {
      await expect(fieldRow(page, 'password')).toContainText('***')
      await main.getByRole('switch', { name: 'Show the user name and the password' }).click()
      await expect(fieldRow(page, 'password')).toContainText('pass')
    })

    await test.step('removes tracking parameters', async () => {
      const stripButton = main.getByRole('button', { name: 'Remove tracking parameters' })
      await stripButton.click()
      await expect(fieldRow(page, 'search')).not.toContainText('utm_source')
      await expect(stripButton).toBeDisabled()
    })

    await test.step('inspects custom URL with port and query parameters', async () => {
      await urlInput.fill('https://kitdev.org:9000/api/test?foo=bar')
      await main.getByRole('button', { name: 'Inspect' }).click()
      await expect(fieldRow(page, 'port')).toContainText('9000')
      await expect(fieldRow(page, 'hostname')).toContainText('kitdev.org')
      await expect(fieldRow(page, 'pathname')).toContainText('/api/test')
    })

    await test.step('clears URL and parsed components', async () => {
      await main.getByRole('button', { name: 'Clear' }).click()
      await expect(urlInput).toHaveValue('')
      await expect(fieldRow(page, 'port')).toHaveCount(0)
    })
  })
})
