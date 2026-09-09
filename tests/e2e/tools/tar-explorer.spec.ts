import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Tar Explorer Tool', () => {
  test('displays dropzone and validates file requirement', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/tar')

    await test.step('displays upload dropzone and action buttons', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText('Drop a .tar, .tgz, or .zip here')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Inspect' })).toBeVisible()
    })

    await test.step('shows error when inspecting without a file', async () => {
      await page.getByRole('button', { name: 'Inspect' }).click()
      await expect(page.getByText('Choose an archive file before you run the tool.')).toBeVisible()
    })

    await test.step('uploads a real tar fixture and inspects its entries', async () => {
      await page.locator('input[type="file"]').setInputFiles('tests/fixtures/pax.tar')
      await page.getByRole('button', { name: 'Inspect' }).click()
      await expect(page.getByText('Archive size')).toBeVisible({ timeout: 10_000 })
      // The page prose also says "entries", so match the counted summary.
      await expect(page.getByText(/\d+ entries/)).toBeVisible()
    })

    await test.step('filters the tree with the path search', async () => {
      await expect(page.getByRole('button', { name: 'readme.md', exact: true })).toBeVisible()
      await page.getByPlaceholder('src/index.ts').fill('binary')
      await expect(page.getByRole('button', { name: 'binary.bin', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'readme.md', exact: true })).toBeHidden()
    })

    await test.step('selects an entry for the zip download', async () => {
      await page.getByRole('checkbox', { name: 'Select src/binary.bin' }).click()
      await expect(page.getByText('1 selected')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Download zip' })).toBeEnabled()
    })
  })
})
