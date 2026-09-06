import { expect, test } from '@playwright/test'
import { fillCodeMirror, getCodeMirrorValue, gotoHydrated } from '../utils'

test.describe('Dev Base64 Encoder / Decoder tool', () => {
  test('encodes text to Base64 and decodes it back', async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/base64')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await fillCodeMirror(page, 'Input', 'KitDev Space')
    const output = await getCodeMirrorValue(page, 'Output')
    expect(output).toContain('S2l0RGV2IFNwYWNl')

    await page.getByRole('button', { name: 'Swap' }).click()
    const swapped = await getCodeMirrorValue(page, 'Output')
    expect(swapped).toContain('KitDev Space')
  })
})
