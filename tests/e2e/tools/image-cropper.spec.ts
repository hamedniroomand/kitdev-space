import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Image Cropper tool', () => {
  test('displays Image Cropper interface and dropzone', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/cropper')

    await expect(page.getByRole('heading', { name: 'Image Cropper', level: 1 })).toBeVisible()
    await expect(page.locator('main').getByText('Drop an image here, or click to choose a file.')).toBeVisible()
  })
})
