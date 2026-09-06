import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts CSV to JSON', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/csv-json')

  await fillCodeMirror(page, 'CSV', 'name,age\nAda,36\nGrace,45')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'JSON' })
  await expect(output).toContainText('"name": "Ada"')
  await expect(output).toContainText('"age": 36')
})
