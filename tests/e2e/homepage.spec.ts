import { expect, test } from '@playwright/test'

test('homepage shows search control', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Search tools', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tools for people who build.' })).toBeVisible()
})
