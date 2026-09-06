import { expect, test } from '@playwright/test'
import { fillCodeMirror, getCodeMirrorValue, gotoHydrated } from '../utils'

test.describe('Encoder & Escaper tool', () => {
  test('encodes and decodes text in various formats', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/encoder')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Enter text to encode
    await fillCodeMirror(page, 'Input', 'Hello World!')

    // Read encoded Base64 output
    const output = await getCodeMirrorValue(page, 'Output')
    expect(output).toContain('SGVsbG8gV29ybGQh')

    // Click Swap to reverse direction
    await page.getByRole('button', { name: 'Swap' }).click()
    const swappedOutput = await getCodeMirrorValue(page, 'Output')
    expect(swappedOutput).toContain('Hello World!')

    // Clear input
    await page.getByRole('button', { name: 'Clear' }).click()
    const clearedInput = await getCodeMirrorValue(page, 'Input')
    expect(clearedInput.replace('Paste text here', '').trim()).toBe('')
  })
})
