import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Tar Explorer Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/tar')
  })

  test('displays upload dropzone and action buttons', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Dropzone prompt text
    await expect(page.getByText('Drop a .tar or .tar.gz here')).toBeVisible()

    // Inspect button
    const inspectBtn = page.getByRole('button', { name: 'Inspect' })
    await expect(inspectBtn).toBeVisible()
  })

  test('shows error when inspecting without a file', async ({ page }) => {
    await page.getByRole('button', { name: 'Inspect' }).click()

    await expect(page.getByText('Choose a tar or tar.gz file before you run the tool.')).toBeVisible()
  })
})
