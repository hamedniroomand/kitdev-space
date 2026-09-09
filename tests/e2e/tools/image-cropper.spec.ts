import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Image Cropper tool', () => {
  test('crops uploaded image with custom selection', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/image/cropper')

    await expect(page.getByRole('heading', { name: 'Image Cropper', level: 1 })).toBeVisible()

    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    await test.step('uploads image file', async () => {
      await page.locator('input[type="file"]').setInputFiles({
        name: 'sample.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      })

      await expect(page.getByText('Before')).toBeVisible()
      await expect(page.getByText('1 × 1')).toBeVisible()
    })

    await test.step('processes image crop', async () => {
      await page.getByRole('button', { name: 'Process' }).click()
      await expect(page.getByText('Image Result')).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
    })

    await test.step('clears image file', async () => {
      await page.getByRole('button', { name: 'Clear', exact: true }).click()
      await expect(page.getByText('Before')).not.toBeVisible()
    })
  })
})
