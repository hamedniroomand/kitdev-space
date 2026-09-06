import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates lorem ipsum text', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/lorem')

  await page.getByRole('button', { name: 'Generate' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText(/[a-z]+/i)
})
