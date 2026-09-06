import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Tar Explorer Tool', () => {
  test('displays dropzone and validates file requirement', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/tar')

    await test.step('displays upload dropzone and action buttons', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText('Drop a .tar or .tar.gz here')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Inspect' })).toBeVisible()
    })

    await test.step('shows error when inspecting without a file', async () => {
      await page.getByRole('button', { name: 'Inspect' }).click()
      await expect(page.getByText('Choose a tar or tar.gz file before you run the tool.')).toBeVisible()
    })
  })
})
