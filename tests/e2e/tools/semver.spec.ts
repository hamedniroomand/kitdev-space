import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Semver Calculator Tool', () => {
  test('expands a range, builds a matrix, bumps a prerelease, and clears the result', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/semver')

    const resultEditor = page.getByRole('textbox', { name: 'Result' })
    const actionSelect = page.locator('select, [role="combobox"]').first()

    await test.step('expands the range and marks each candidate version', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Run' }).click()
      await expect(page.getByText('>=1.0.0 <2.0.0', { exact: true })).toBeVisible()
      await expect(page.getByText('Match', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('No match', { exact: true }).first()).toBeVisible()
    })

    await test.step('builds the compatibility matrix', async () => {
      await actionSelect.click()
      await page.getByRole('option', { name: 'Compatibility matrix' }).click()
      await page.getByRole('button', { name: 'Run' }).click()

      await expect(page.getByRole('columnheader', { name: /\^1\.0\.0/ })).toBeVisible()
      await expect(page.getByRole('cell', { name: '1.2.0 matches ^1.0.0' })).toBeVisible()
      await expect(page.getByRole('cell', { name: '2.0.0 does not match ^1.0.0' })).toBeVisible()
    })

    await test.step('bumps a prerelease version in the browser', async () => {
      await actionSelect.click()
      await page.getByRole('option', { name: 'Bump version' }).click()
      await page.getByRole('textbox', { name: 'Version', exact: true }).fill('1.2.3-beta.1')
      await page.getByRole('combobox').nth(1).click()
      await page.getByRole('option', { name: 'Prerelease' }).click()
      await page.getByRole('button', { name: 'Run' }).click()

      await expect(resultEditor).toContainText('1.2.3-beta.2')
    })

    await test.step('clears output and resets state', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(resultEditor).not.toBeVisible()
    })
  })
})
