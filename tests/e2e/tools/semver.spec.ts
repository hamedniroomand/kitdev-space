import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Semver Calculator Tool', () => {
  test('calculates semver satisfies, bumps version, and clears result', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/semver')

    const resultEditor = page.getByRole('textbox', { name: 'Result' })

    await test.step('checks satisfies range with default inputs', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Run' }).click()
      await expect(resultEditor).toBeVisible()
      const resultText = (await resultEditor.textContent()) ?? ''
      expect(resultText).toContain('true — version satisfies range')
    })

    await test.step('bumps semver version in browser', async () => {
      const actionSelect = page.locator('select, [role="combobox"]').first()
      await actionSelect.click()
      await page.getByRole('option', { name: 'Bump version' }).click()

      await page.getByRole('button', { name: 'Run' }).click()
      await expect(resultEditor).toBeVisible()
      const resultText = (await resultEditor.textContent()) ?? ''
      expect(resultText).toContain('1.2.4')
    })

    await test.step('clears output and resets state', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(resultEditor).not.toBeVisible()
    })
  })
})
