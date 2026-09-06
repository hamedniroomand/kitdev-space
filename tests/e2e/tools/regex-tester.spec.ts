import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('RegEx Tester Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/regex-tester')
  })

  test('tests default pattern against sample text', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Matches badge should show matches count
    await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible()
    const matchesSection = page.locator('section').filter({ hasText: 'Matches' })
    await expect(matchesSection.locator('mark').first()).toBeVisible()

    // Explanations should be visible
    await expect(page.getByRole('heading', { name: 'Token explanation' })).toBeVisible()
  })

  test('updates match count when pattern changes', async ({ page }) => {
    const patternInput = page.getByPlaceholder('Enter a regular expression')
    await patternInput.fill('KitDev')

    const matchesSection = page.locator('section').filter({ hasText: 'Matches' })
    const marks = matchesSection.locator('mark')
    await expect(marks).toHaveCount(1)
    await expect(marks.first()).toHaveText('KitDev')
  })

  test('clears pattern and sample text', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear' }).click()

    const patternInput = page.getByPlaceholder('Enter a regular expression')
    await expect(patternInput).toHaveValue('')

    const sampleEditor = page.locator('.cm-editor')
    const sampleLines = sampleEditor.locator('.cm-line')
    expect(await sampleLines.count()).toBe(1)
    const sampleLineText = (await sampleLines.first().textContent()) ?? ''
    expect(sampleLineText.replace('Paste text to test against the pattern', '').trim()).toBe('')
  })
})
