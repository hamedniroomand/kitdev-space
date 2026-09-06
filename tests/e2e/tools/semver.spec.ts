import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Semver Calculator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/semver')
  })

  test('checks satisfies range with default inputs', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Default: satisfies, version 1.2.3, range ^1.0.0
    await page.getByRole('button', { name: 'Run' }).click()

    const resultEditor = page.locator('.cm-editor')
    await expect(resultEditor).toBeVisible()

    const resultText = (await resultEditor.textContent()) ?? ''
    expect(resultText).toContain('true — version satisfies range')
  })

  test('bumps semver version in browser', async ({ page }) => {
    // Switch action to Bump version
    const actionSelect = page.locator('select, [role="combobox"]').first()
    await actionSelect.click()
    await page.getByRole('option', { name: 'Bump version' }).click()

    // Click Run (patch bump of 1.2.3 -> 1.2.4)
    await page.getByRole('button', { name: 'Run' }).click()

    const resultEditor = page.locator('.cm-editor')
    await expect(resultEditor).toBeVisible()

    const resultText = (await resultEditor.textContent()) ?? ''
    expect(resultText).toContain('1.2.4')
  })

  test('clears output and resets state', async ({ page }) => {
    await page.getByRole('button', { name: 'Run' }).click()

    const resultEditor = page.locator('.cm-editor')
    await expect(resultEditor).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(resultEditor).not.toBeVisible()
  })
})
