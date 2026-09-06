import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Image Converter tool', () => {
  test('displays Image Converter interface and dropzone', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/converter')

    await expect(page.getByRole('heading', { name: 'Image Converter', level: 1 })).toBeVisible()
    await expect(page.locator('main').getByText('Drop an image here, or click to choose a file.')).toBeVisible()
  })
})
