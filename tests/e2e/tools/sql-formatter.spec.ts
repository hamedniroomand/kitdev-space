import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('formats SQL queries', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/sql-formatter')

  await fillCodeMirror(page, 'Input', 'select id, name from users where active = 1;')
  await page.getByRole('button', { name: 'Format', exact: true }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('SELECT')
  await expect(output).toContainText('FROM')
  await expect(output).toContainText('WHERE')
})
