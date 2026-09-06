import { expect, test } from '@playwright/test'
import { fillCodeMirror, getCodeMirrorValue, gotoHydrated } from '../utils'

test.describe('URL Encoder / Decoder tool', () => {
  test('encodes and decodes URL components', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/url-encoder')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await fillCodeMirror(page, 'Input', 'hello world&test=1')
    const output = await getCodeMirrorValue(page, 'Output')
    expect(output).toContain('hello%20world%26test%3D1')

    await page.getByRole('button', { name: 'Swap' }).click()
    const swapped = await getCodeMirrorValue(page, 'Output')
    expect(swapped).toContain('hello world&test=1')
  })
})
