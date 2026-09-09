import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('inspects Unicode characters and detects hidden marks', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/unicode')

  const textarea = page.getByPlaceholder('Paste or type text to inspect Unicode characters...')

  await test.step('inspects default text with hidden zero-width marks', async () => {
    await expect(page.getByText('Hidden Characters Detected')).toBeVisible()
    // The page also holds a "Code Points" view tab, so target the stat card.
    await expect(page.getByLabel('Code Points').getByText('Code Points')).toBeVisible()
  })

  await test.step('updates inspection when typing standard text', async () => {
    await textarea.fill('ABC')
    await expect(page.getByText('Hidden Characters Detected')).not.toBeVisible()
    await expect(page.getByText('U+0041')).toBeVisible()
    await expect(page.getByText('U+0042')).toBeVisible()
    await expect(page.getByText('U+0043')).toBeVisible()
  })

  await test.step('clears input and results', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(textarea).toHaveValue('')
    await expect(page.getByText('U+0041')).not.toBeVisible()
  })
})
