import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('calculates text statistics', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/text-stats')

  await fillCodeMirror(page, 'Text input', 'One two three four five.')

  await expect(page.getByText('Words', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Word count').getByText('5', { exact: true })).toBeVisible()
})
