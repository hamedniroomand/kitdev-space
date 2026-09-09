import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('creates share link with input in hash and restores on load', async ({ page }) => {
  const sharedText = '{"shared":true,"count":42}'
  const encoded = encodeURIComponent(sharedText)

  // Open the tool with the input encoded in the URL hash fragment
  await gotoHydrated(page, `/hub/data/json-formatter#input=${encoded}`)

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toBeVisible()
  // The input is a CodeMirror editor, so it holds text rather than a value.
  await expect(input).toContainText(sharedText)
})
