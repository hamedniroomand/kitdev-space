import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('AST & Module Resolver Playground Tool', () => {
  test('parses AST, runs code transform, and clears state', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/ast-playground')

    const treeNodeBtn = page.locator('button').filter({ hasText: 'Program' }).first()

    await test.step('parses AST from sample code', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Parse AST' }).click()
      await expect(treeNodeBtn).toBeVisible({ timeout: 10_000 })
    })

    await test.step('runs code transform', async () => {
      await page.getByRole('button', { name: 'Transform' }).click()
      const outputEditor = page.getByRole('textbox', { name: 'OXC transform output' })
      await expect(outputEditor).toBeVisible({ timeout: 10_000 })
    })

    await test.step('clears input and parsed results', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(treeNodeBtn).not.toBeVisible()

      const inputEditor = page.getByRole('textbox', { name: 'Source' })
      const inputLineText = (await inputEditor.textContent()) ?? ''
      expect(inputLineText.replace('Paste JavaScript or TypeScript', '').trim()).toBe('')
    })
  })
})
