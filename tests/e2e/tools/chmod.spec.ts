import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Chmod Calculator tool', () => {
  test('calculates permissions, symbolic notation, and preset commands', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/chmod')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default 755
    const octalInput = page.locator('main').getByPlaceholder('755')
    await expect(octalInput).toHaveValue('755')
    await expect(page.locator('main').getByText('chmod 755 file.txt')).toBeVisible()

    // Click 644 preset
    await page.getByRole('button', { name: /644/ }).click()
    await expect(octalInput).toHaveValue('644')
    await expect(page.locator('main').getByText('chmod 644 file.txt')).toBeVisible()
  })

  test('reads a symbolic string with a special bit', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/chmod')

    const octalInput = page.locator('main').getByPlaceholder('755')
    const symbolicInput = page.locator('main').getByPlaceholder('rwxr-xr-x')

    await symbolicInput.fill('rwxr-sr-x')
    await expect(octalInput).toHaveValue('2755')
    await expect(page.locator('main').getByRole('checkbox', { name: 'SetGID (s = 2)', exact: true })).toBeChecked()
    await expect(page.locator('main').getByText('chmod 2755 file.txt')).toBeVisible()
  })

  test('quotes a file name that contains a space', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/chmod')

    await page.locator('main').getByPlaceholder('file.txt').fill('my file.txt')
    await expect(page.locator('main').getByText('chmod 755 \'my file.txt\'')).toBeVisible()
  })
})
