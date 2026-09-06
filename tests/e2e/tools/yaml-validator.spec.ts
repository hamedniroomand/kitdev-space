import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('validates YAML content', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/yaml-validator')

  await expect(page.getByText('Valid YAML')).toBeVisible()

  await fillCodeMirror(page, 'YAML Source', 'invalid:\n  - item\n bad_indent')
  await expect(page.getByText('Syntax Error').first()).toBeVisible()
})
