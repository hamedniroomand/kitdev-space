import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('compares texts and displays diff summary', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/text-diff')

  await fillCodeMirror(page, 'Original', 'Hello world\nSecond line')
  await fillCodeMirror(page, 'Modified', 'Hello universe\nSecond line')
  await page.getByRole('button', { name: 'Compare' }).click()

  await expect(page.getByText(/added ·.*removed/)).toBeVisible()
})
