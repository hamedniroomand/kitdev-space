import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Cron Visualizer Tool', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/cron')
  })

  test('previews default cron expression and shows next runs', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Preview' }).click()

    // Summary and Next 5 runs should become visible
    await expect(page.getByText('Summary')).toBeVisible()
    await expect(page.getByText(/Next 5 runs/)).toBeVisible()
    const runs = page.locator('ol li')
    expect(await runs.count()).toBeGreaterThanOrEqual(5)
  })

  test('changes timezone and updates preview', async ({ page }) => {
    const tzSelect = page.locator('select, [role="combobox"]').first()
    await tzSelect.click()
    await page.getByRole('option', { name: 'Asia/Tokyo' }).click()

    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText('Next 5 runs (Asia/Tokyo)')).toBeVisible()
  })

  test('clears output and resets preview', async ({ page }) => {
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByText('Summary')).toBeVisible()

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(page.getByText('Summary')).not.toBeVisible()
  })
})
