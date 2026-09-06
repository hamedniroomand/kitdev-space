import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Code Minifier and Beautifier Tool', () => {
  test('minifies, beautifies, and clears code editors', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/code-minifier')

    const outputEditor = page.getByRole('textbox', { name: 'Output' })

    await test.step('minifies JavaScript sample', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Minify' }).click()
      await expect(outputEditor).toBeVisible()
      await expect(async () => {
        const outputText = (await outputEditor.textContent()) ?? ''
        expect(outputText).toContain('function ')
        expect(outputText).toContain('console.log')
      }).toPass({ timeout: 10_000 })
    })

    await test.step('beautifies minified code', async () => {
      const actionSelect = page.locator('select, [role="combobox"]').nth(1)
      await actionSelect.click()
      await page.getByRole('option', { name: 'Beautify' }).click()

      const beautifyBtn = page.getByRole('button', { name: 'Beautify' })
      await expect(beautifyBtn).toBeVisible()
      await beautifyBtn.click()
      await expect(outputEditor).toBeVisible()

      await expect(async () => {
        const outputText = (await outputEditor.textContent()) ?? ''
        expect(outputText).toContain('greet("world")')
      }).toPass({ timeout: 10_000 })
    })

    await test.step('clears input and output', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()

      const inputEditor = page.getByRole('textbox', { name: 'Input' })
      const inputText = (await inputEditor.textContent()) ?? ''
      expect(inputText.replace('Paste code here', '').trim()).toBe('')

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText.replace('Result appears here', '').trim()).toBe('')
    })
  })
})
