import { expect, test } from '@playwright/test'
import { dropFile, gotoHydrated } from './utils'

test('populates editor when dropping a text file', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const filePayload = '{\n  "dropped": true,\n  "success": 1\n}'
  await dropFile(page, '.tool-editor', {
    name: 'test.json',
    mimeType: 'application/json',
    content: filePayload,
  })

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toBeVisible()
  await expect(input).toHaveValue(filePayload)
})
