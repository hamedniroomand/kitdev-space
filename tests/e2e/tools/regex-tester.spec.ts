import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('RegEx Tester Tool', () => {
  test('tests pattern matching, updates, and clearing', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/regex-tester')

    const matchesSection = page.locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Matches', exact: true }) })

    await test.step('tests default pattern against sample text', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Matches' })).toBeVisible()
      await expect(matchesSection.getByText(/Match 1 · \d+–\d+ · Hello/)).toBeVisible()
      await expect(matchesSection.getByText(/Match 2 · \d+–\d+ · Space/)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Token explanation' })).toBeVisible()
    })

    await test.step('labels the engine', async () => {
      await expect(page.getByText('ECMAScript (this browser)')).toBeVisible()
    })

    await test.step('previews the replacement with a named group', async () => {
      await expect(page.getByLabel('Replacement preview')).toHaveText(
        '[Hello] world. KitDev [Space] helps builders ship tools.',
      )
    })

    await test.step('evaluates the test cases', async () => {
      await expect(page.getByText('2 pass')).toBeVisible()
      await expect(page.getByText('0 fail')).toBeVisible()
    })

    await test.step('updates matches when pattern changes', async () => {
      const patternInput = page.getByPlaceholder('Enter a regular expression')
      await patternInput.fill('KitDev')

      await expect(matchesSection.getByText(/Match 1 · \d+–\d+ · KitDev/)).toBeVisible()
      await expect(matchesSection.getByText(/Match 2/)).toHaveCount(0)
      // "KitDev" never matches "hello", so the negative test case still passes.
      await expect(page.getByText('1 pass')).toBeVisible()
      await expect(page.getByText('1 fail')).toBeVisible()
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

  test('exposes the v flag and the d flag', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/regex-tester')

    const unicode = page.getByRole('checkbox', { name: 'u (Unicode)', exact: true })
    const unicodeSets = page.getByRole('checkbox', { name: 'v (Unicode sets)', exact: true })
    const matchIndices = page.getByRole('checkbox', { name: 'd (Match indices)', exact: true })
    await expect(unicodeSets).toBeVisible()
    await expect(matchIndices).toBeVisible()

    // The u flag and the v flag cannot both be set.
    await unicode.check()
    await unicodeSets.check()
    await expect(unicode).not.toBeChecked()
  })

  test('shows timeout error for catastrophic backtracking and preserves input', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/regex-tester')

    const patternInput = page.getByPlaceholder('Enter a regular expression')
    const sampleEditor = page.getByRole('textbox', { name: 'Sample text' })

    // Enter a pattern that causes catastrophic backtracking
    await patternInput.fill('(a+)+$')
    await sampleEditor.fill(`${'a'.repeat(30)}!`)

    // The Stop button should appear while the worker is running
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 2_000 })

    // The timeout error should appear within 4 s (2 s timeout + margin)
    await expect(page.getByText('Execution timed out')).toBeVisible({ timeout: 4_000 })

    // Input is preserved after the timeout
    await expect(patternInput).toHaveValue('(a+)+$')
    const sampleText = await sampleEditor.textContent()
    expect(sampleText).toContain('a'.repeat(30))
  })
})
