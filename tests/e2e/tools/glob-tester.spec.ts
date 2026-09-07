import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Glob Tester tool', () => {
  test('tests glob patterns against sample paths and updates matches', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/glob-tester')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Expect initial matches
    await expect(page.locator('main').getByText('3 / 7 matched')).toBeVisible()

    // Test a preset
    await page.getByRole('button', { name: '*.ts (TypeScript files)' }).click()
    await expect(page.locator('main').getByText('2 / 7 matched')).toBeVisible()

    // Test the brace expansion preset
    await page.getByRole('button', { name: '**/*.{json,md} (Configs and Docs)' }).click()
    await expect(page.locator('main').getByText('2 / 7 matched')).toBeVisible()
    await expect(page.locator('main').getByText('package.json', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('docs/README.md', { exact: true })).toBeVisible()

    // Enter custom pattern
    const patternInput = page.locator('main').getByPlaceholder('e.g. src/**/*.vue or *.ts')
    await patternInput.fill('**/*.md')
    await expect(page.locator('main').getByText('1 / 7 matched')).toBeVisible()
    await expect(page.locator('main').getByText('docs/README.md', { exact: true })).toBeVisible()
  })
})
