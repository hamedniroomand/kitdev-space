import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Code Transpiler Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/transpiler')
  })

  test('transpiles TypeScript sample to JavaScript', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Transpile' }).click()

    // Output editor should contain compiled JS without type definitions
    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

    await expect(async () => {
      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('export function greet(user)')
      expect(outputText).not.toContain('type User =')
    }).toPass({ timeout: 10_000 })
  })

  test('clears input and output', async ({ page }) => {
    await page.getByRole('button', { name: 'Transpile' }).click()

    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible()

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
