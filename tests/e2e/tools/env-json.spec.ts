import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts .env format to JSON', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/env-json')

  await fillCodeMirror(page, 'Input (.env format)', 'PORT=8080\nHOST=localhost')

  const output = page.getByRole('textbox', { name: 'Output (JSON format)' })
  await expect(output).toContainText('"PORT": "8080"')
  await expect(output).toContainText('"HOST": "localhost"')
})
