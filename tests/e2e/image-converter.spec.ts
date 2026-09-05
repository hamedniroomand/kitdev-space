import { expect, test } from '@playwright/test'

test('shows Image Converter dropzone', async ({ page }) => {
  await page.goto('/image/converter')

  await expect(page.getByRole('heading', { name: 'Image Converter' })).toBeVisible()
  await expect(page.getByText('Drop an image here, or click to choose a file.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Convert' })).toBeVisible()
})
