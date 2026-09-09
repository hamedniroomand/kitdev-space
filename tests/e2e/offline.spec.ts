import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test.describe('Progressive Web App Offline Mode', () => {
  test('client-only tool executes successfully with network disabled', async ({ page, context }) => {
    await gotoHydrated(page, '/hub/data/json-formatter')

    // The editor hydrates when the main thread goes idle, which is after the
    // page reports hydration. Wait for it while the network still works, so
    // going offline cannot strand its chunk.
    const input = page.getByRole('textbox', { name: 'Input' })
    await expect(input).toBeVisible()

    // Disconnect network
    await context.setOffline(true)

    await input.fill('{"offline":true,"tool":"json-formatter"}')
    await page.getByRole('button', { name: 'Format' }).click()

    await expect(page.getByText('Valid JSON')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('"offline": true')

    // Re-enable network
    await context.setOffline(false)
  })

  test('server-dependent tool displays clear offline notice when network is unavailable', async ({ page, context }) => {
    await gotoHydrated(page, '/hub/network/email-health')

    // Disconnect network
    await context.setOffline(true)

    // Verify offline mode notice appears
    await expect(page.getByText('Offline mode')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('This tool needs a network connection to run on the server.')).toBeVisible()

    // Attempting to run while offline triggers offline error
    const domainInput = page.locator('main').getByPlaceholder('example.com')
    await domainInput.fill('example.com')
    await page.locator('main').getByRole('button', { name: 'Inspect' }).click()

    await expect(page.getByText('Network connection is unavailable. Connect to the internet to run this tool.')).toBeVisible()

    // Re-enable network
    await context.setOffline(false)
  })
})
