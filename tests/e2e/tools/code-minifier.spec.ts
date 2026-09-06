import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Code Minifier and Beautifier Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/code-minifier')
  })

  test('minifies JavaScript sample', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Minify' }).click()

    // Output editor should contain minified output
    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    const outputText = (await outputEditor.textContent()) ?? ''
    expect(outputText).toContain('function ')
    expect(outputText).toContain('console.log')
  })

  test('beautifies minified code', async ({ page }) => {
    // Switch action to Beautify
    const actionSelect = page.locator('select, [role="combobox"]').nth(1)
    await actionSelect.click()
    await page.getByRole('option', { name: 'Beautify' }).click()

    // Wait for the button label to reflect Beautify
    const beautifyBtn = page.getByRole('button', { name: 'Beautify' })
    await expect(beautifyBtn).toBeVisible()
    await beautifyBtn.click()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    // Output should contain formatted JS with proper spacing and indentation
    await expect(async () => {
      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('greet("world")')
    }).toPass({ timeout: 10_000 })
  })

  test('clears input and output', async ({ page }) => {
    await page.getByRole('button', { name: 'Minify' }).click()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()

    const inputEditor = page.locator('.cm-editor').first()
    const inputLines = inputEditor.locator('.cm-line')
    expect(await inputLines.count()).toBe(1)
    const inputLineText = (await inputLines.first().textContent()) ?? ''
    expect(inputLineText.replace('Paste code here', '').trim()).toBe('')

    const outputLines = outputEditor.locator('.cm-line')
    expect(await outputLines.count()).toBe(1)
    const outputLineText = (await outputLines.first().textContent()) ?? ''
    expect(outputLineText.replace('Result appears here', '').trim()).toBe('')
  })
})
