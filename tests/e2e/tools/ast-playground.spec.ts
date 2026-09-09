import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

async function selectOption(page: Page, field: string, option: string) {
  await page.getByRole('combobox', { name: field }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.describe('AST & Module Resolver Playground Tool', () => {
  test('parses AST, runs code transform, and clears state', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/ast-playground')

    const rootNode = page.getByRole('treeitem', { name: 'Program', exact: true })

    await test.step('parses AST from sample code', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.getByRole('button', { name: 'Parse AST' }).click()
      await expect(page.getByRole('tree', { name: 'AST nodes' })).toBeVisible({ timeout: 10_000 })
      await expect(rootNode).toBeVisible()
    })

    await test.step('marks nodes by type name', async () => {
      await page.getByRole('textbox', { name: 'Node type filter' }).fill('Identifier')
      await expect(page.getByText(/[1-9]\d* marked nodes/)).toBeVisible({ timeout: 10_000 })
    })

    await test.step('runs code transform', async () => {
      await page.getByRole('button', { name: 'Transform' }).click()
      const outputEditor = page.getByRole('textbox', { name: 'OXC transform output' })
      await expect(outputEditor).toBeVisible({ timeout: 10_000 })
    })

    await test.step('clears input and parsed results', async () => {
      await page.getByRole('button', { name: 'Clear' }).click()
      await expect(rootNode).not.toBeVisible()

      const inputEditor = page.getByRole('textbox', { name: 'Source' })
      const inputLineText = (await inputEditor.textContent()) ?? ''
      expect(inputLineText.replace('Paste JavaScript or TypeScript', '').trim()).toBe('')
    })
  })

  test('renders the AST straight after a sample level change', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/ast-playground')

    await selectOption(page, 'Sample level', 'Advanced')

    const tree = page.getByRole('tree', { name: 'AST nodes' })
    await expect(tree).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('treeitem', { name: 'Program', exact: true })).toBeVisible()
    // A child node proves the branch rendered without a click on Parse AST.
    await expect(tree.getByRole('group').getByRole('treeitem').first()).toBeVisible()
  })
})
