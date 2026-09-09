import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('Case and Slug Converter tool', () => {
  test('converts input text into multiple case conventions', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/case-converter')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default sample conversions
    await expect(page.locator('main').getByText('helloWorldDeveloper', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('HelloWorldDeveloper', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('hello_world_developer', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('hello-world-developer', { exact: true }).first()).toBeVisible()
    await expect(page.locator('main').getByText('HELLO_WORLD_DEVELOPER', { exact: true })).toBeVisible()

    // Type custom text
    await fillCodeMirror(page, 'Input Text', 'quick brown fox')
    await expect(page.locator('main').getByText('quickBrownFox', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('quick-brown-fox', { exact: true }).first()).toBeVisible()

    // Clear
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.locator('main').getByText('quickBrownFox', { exact: true })).not.toBeVisible()
  })

  test('converts each line on its own in line mode', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/case-converter')

    await fillCodeMirror(page, 'Input Text', 'hello world\nsecond line')
    await page.getByRole('switch', { name: 'Independent lines' }).click()

    // Whole-text mode gives 'helloWorldSecondLine', so the lowercase 's' proves the split.
    await expect(page.locator('main')).toContainText('secondLine')
  })
})
