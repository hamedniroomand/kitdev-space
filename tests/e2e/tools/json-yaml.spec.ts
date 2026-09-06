import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON to YAML', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  await fillCodeMirror(page, 'Input', '{"name": "KitDev", "ready": true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('name: KitDev')
  await expect(output).toContainText('ready: true')
})
