import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('validates data against JSON Schema', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-schema')

  await expect(page.getByRole('heading', { name: 'JSON Schema Validator', level: 1 })).toBeVisible()
  await fillCodeMirror(page, 'JSON Data', '{\n  "id": 1\n}')
  await expect(page.getByRole('textbox', { name: 'JSON Data' })).toBeVisible()
})
