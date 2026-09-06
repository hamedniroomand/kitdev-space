import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('compiles markdown to preview', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/markdown-studio')

  await fillCodeMirror(page, 'Markdown Input', '# Hello Playwright\n\n- [x] Tested')
  await expect(page.locator('h1', { hasText: 'Hello Playwright' })).toBeVisible()
})
