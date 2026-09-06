import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Image Resizer tool', () => {
  test('displays Image Resizer interface and presets', async ({ page }) => {
    await gotoHydrated(page, '/hub/image/resizer')

    await expect(page.getByRole('heading', { name: 'Image Resizer', level: 1 })).toBeVisible()
    await expect(page.locator('main').getByText('Drop an image here, or click to choose a file.')).toBeVisible()
  })
})
