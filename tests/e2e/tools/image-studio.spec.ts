import { expect, test } from '@playwright/test'

test('shows the Image Studio dropzone', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/hub/image/studio')

  await expect(page.getByRole('heading', { name: 'Image Studio', level: 1 })).toBeVisible()
  await expect(page.getByText('Drop an image here, or click to choose a file.')).toBeVisible()
})

test('redirects the merged transform route to the studio', async ({ page }) => {
  await page.goto('/hub/image/transform')
  await expect(page).toHaveURL(/\/hub\/image\/studio$/)
})

test('serves the resizer and the converter as variant pages', async ({ page }) => {
  await test.step('serves resizer page', async () => {
    await page.goto('/hub/image/resizer')
    await expect(page.getByRole('heading', { name: 'Image Resizer', level: 1 })).toBeVisible()
  })

  await test.step('serves converter page', async () => {
    await page.goto('/hub/image/converter')
    await expect(page.getByRole('heading', { name: 'Image Converter', level: 1 })).toBeVisible()
  })

  await test.step('serves cropper page', async () => {
    await page.goto('/hub/image/cropper')
    await expect(page.getByRole('heading', { name: 'Image Cropper', level: 1 })).toBeVisible()
  })
})

test('redirects the exif stripper to the exif remover', async ({ page }) => {
  await page.goto('/hub/image/exif-stripper')
  await expect(page).toHaveURL(/\/hub\/image\/exif-remover$/)
  await expect(page.getByRole('heading', { name: 'Remove EXIF Data from a Photo', level: 1 })).toBeVisible()
})
