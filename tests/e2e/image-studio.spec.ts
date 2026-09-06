import { expect, test } from '@playwright/test'

test('shows the Image Studio dropzone', async ({ page }) => {
  await page.goto('/hub/image/studio')

  await expect(page.getByRole('heading', { name: 'Image Studio', level: 1 })).toBeVisible()
  await expect(page.getByText('Drop an image here, or click to choose a file.')).toBeVisible()
})

test('redirects the merged image tool routes to the studio', async ({ page }) => {
  for (const route of ['/hub/image/converter', '/hub/image/resizer', '/hub/image/transform']) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/hub\/image\/studio$/)
  }
})

test('redirects the exif stripper to the metadata inspector', async ({ page }) => {
  await page.goto('/hub/image/exif-stripper')
  await expect(page).toHaveURL(/\/hub\/image\/metadata$/)
})
