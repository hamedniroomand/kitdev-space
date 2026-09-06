import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON to XML', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-xml')

  await fillCodeMirror(page, 'Input', '{"name": "KitDev"}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('<name>KitDev</name>')
})
