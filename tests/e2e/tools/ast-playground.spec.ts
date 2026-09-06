import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('AST & Module Resolver Playground Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/ast-playground')
  })

  test('parses AST from sample code', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Parse AST' }).click()

    // AstTreeNode renders a button with Program text
    const treeNodeBtn = page.locator('button').filter({ hasText: 'Program' }).first()
    await expect(treeNodeBtn).toBeVisible({ timeout: 10_000 })
  })

  test('runs code transform', async ({ page }) => {
    await page.getByRole('button', { name: 'Transform' }).click()

    // Transformed output editor should be visible
    const outputEditor = page.locator('.cm-editor').nth(1)
    await expect(outputEditor).toBeVisible({ timeout: 10_000 })
  })

  test('clears input and parsed results', async ({ page }) => {
    await page.getByRole('button', { name: 'Parse AST' }).click()
    const treeNodeBtn = page.locator('button').filter({ hasText: 'Program' }).first()
    await expect(treeNodeBtn).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(treeNodeBtn).not.toBeVisible()

    const inputEditor = page.locator('.cm-editor').first()
    const inputLines = inputEditor.locator('.cm-line')
    expect(await inputLines.count()).toBe(1)
    const inputLineText = (await inputLines.first().textContent()) ?? ''
    expect(inputLineText.replace('Paste JavaScript or TypeScript', '').trim()).toBe('')
  })
})
