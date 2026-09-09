import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test.describe('Cron Visualizer Tool', () => {
  test('describes a schedule live, changes timezone, and warns about a schedule that never runs', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/cron')

    const input = page.getByRole('textbox', { name: 'Cron expression' })

    await test.step('describes the default expression and lists the next runs', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByText('At 09:30, Monday through Friday')).toBeVisible()
      await expect(page.getByRole('columnheader', { name: 'UTC' })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(5)
    })

    await test.step('updates the description as the user types', async () => {
      await input.fill('*/15 * * * *')
      await expect(page.getByText('Every 15 minutes')).toBeVisible()
    })

    await test.step('warns that an impossible date never runs', async () => {
      await input.fill('0 0 31 2 *')
      await expect(page.getByText('Never runs')).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(0)
    })

    await test.step('shows an error for an expression that is not valid', async () => {
      await input.fill('61 * * * *')
      await expect(page.getByText('Never runs')).toBeHidden()
      await expect(page.getByText(/61/)).toBeVisible()
    })

    await test.step('adds a column for the selected timezone', async () => {
      await input.fill('30 9 * * MON-FRI')
      // The USelectMenu trigger is a button, not a combobox.
      await page.getByRole('button', { name: 'Timezone' }).click()
      // The list holds every IANA zone, so the option needs the search input.
      await page.getByPlaceholder('Search timezones').fill('Asia/Tokyo')
      await page.getByRole('option', { name: 'Asia/Tokyo' }).click()
      await expect(page.getByRole('columnheader', { name: 'Asia/Tokyo' })).toBeVisible()
    })

    await test.step('offers a share link', async () => {
      await expect(page.getByRole('button', { name: 'Copy a link to this schedule' })).toBeVisible()
    })
  })
})
