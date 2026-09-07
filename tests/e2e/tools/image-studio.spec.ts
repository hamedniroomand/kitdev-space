import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

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

test('converts a JPEG to WebP in the browser with no server request', async ({ page }) => {
  const apiCalls: string[] = []
  await page.route('/api/image/**', async (route) => {
    apiCalls.push(route.request().url())
    await route.continue()
  })

  await gotoHydrated(page, '/hub/image/converter')

  // Upload a minimal valid JPEG (1×1 pixel)
  const jpegBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof'
    + 'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh'
    + 'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR'
    + 'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAA'
    + 'AAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQAC'
    + 'EQMRAD8AKwA//9k=',
    'base64',
  )

  await page.locator('input[type="file"]').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: jpegBuffer,
  })

  await expect(page.getByText('Before')).toBeVisible()

  // Default format is WebP, which processes in the browser
  await page.getByRole('button', { name: 'Process' }).click()
  await expect(page.getByText('Result', { exact: true })).toBeVisible({ timeout: 15_000 })

  expect(apiCalls).toEqual([])
})
