import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('validates data against JSON Schema', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-schema')

  await expect(page.getByRole('heading', { name: 'JSON Schema Validator', level: 1 })).toBeVisible()
  await fillCodeMirror(page, 'JSON Data', '{\n  "id": 1\n}')
  await expect(page.getByRole('textbox', { name: 'JSON Data' })).toBeVisible()
})

test('validates the sample and reports errors without eval', async ({ page }) => {
  const policyErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy|unsafe-eval/.test(message.text())) {
      policyErrors.push(message.text())
    }
  })

  await gotoHydrated(page, '/hub/data/json-schema')

  // The sample data matches the sample schema.
  await expect(page.getByText('Data is Valid')).toBeVisible()

  // A wrong type and a missing field give two errors.
  await fillCodeMirror(page, 'JSON Data', '{\n  "id": "one",\n  "name": "Jane Doe"\n}')
  await expect(page.getByText('Validation Failed')).toBeVisible()
  await expect(page.getByText('Found 2 validation errors:')).toBeVisible()
  await expect(page.getByText('/id', { exact: true })).toBeVisible()

  expect(policyErrors).toEqual([])
})
