import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('RegEx Tester Tool', () => {
  test('tests pattern matching, updates, and clearing', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/regex-tester')

    await test.step('tests default pattern against sample text', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible()
      const matchesSection = page.locator('section').filter({ hasText: 'Matches' })
      await expect(matchesSection.locator('mark').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Token explanation' })).toBeVisible()
    })

    await test.step('updates match count when pattern changes', async () => {
      const patternInput = page.getByPlaceholder('Enter a regular expression')
      await patternInput.fill('KitDev')

      const matchesSection = page.locator('section').filter({ hasText: 'Matches' })
      const marks = matchesSection.locator('mark')
      await expect(marks).toHaveCount(1)
      await expect(marks.first()).toHaveText('KitDev')
    })

    await test.step('clears pattern and sample text', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()

      const patternInput = page.getByPlaceholder('Enter a regular expression')
      await expect(patternInput).toHaveValue('')

      const sampleEditor = page.getByRole('textbox', { name: 'Sample text' })
      const sampleText = (await sampleEditor.textContent()) ?? ''
      expect(sampleText.replace('Paste text to test against the pattern', '').trim()).toBe('')
    })
  })
})
