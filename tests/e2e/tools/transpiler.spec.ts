import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Code Transpiler Tool', () => {
  test('transpiles TypeScript sample and clears editors', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/transpiler')

    const outputEditor = page.locator('.cm-editor').nth(1)

    await test.step('transpiles TypeScript sample to JavaScript', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Transpile' }).click()
      await expect(outputEditor).toBeVisible()
      await expect(async () => {
        const outputText = (await outputEditor.textContent()) ?? ''
        expect(outputText).toContain('export function greet(user)')
        expect(outputText).not.toContain('type User =')
      }).toPass({ timeout: 10_000 })
    })

    await test.step('clears input and output', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()

      const inputEditor = page.locator('.cm-editor').first()
      const inputLines = inputEditor.locator('.cm-line')
      expect(await inputLines.count()).toBe(1)
      const inputLineText = (await inputLines.first().textContent()) ?? ''
      expect(inputLineText.replace('Paste TypeScript or JSX', '').trim()).toBe('')

      const outputLines = outputEditor.locator('.cm-line')
      expect(await outputLines.count()).toBe(1)
      const outputLineText = (await outputLines.first().textContent()) ?? ''
      expect(outputLineText.replace('JavaScript appears here', '').trim()).toBe('')
    })
  })
})
