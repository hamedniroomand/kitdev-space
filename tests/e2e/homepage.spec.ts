import { expect, test } from '@playwright/test'

test('homepage explains the tools and opens the hub', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Small tasks\.\s*Useful tools\./ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Know where your input goes.' })).toBeVisible()
  await expect(page.getByText('Each tool explains where its work runs.', { exact: false })).toBeVisible()

  await page.getByRole('link', { name: 'Browse tools', exact: true }).click()
  await expect(page).toHaveURL(/\/hub$/)
})

test('homepage offers search and a direct tool entry on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await page.getByRole('button', { name: 'Find a tool', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: /SQLite Studio Inspect/ }).click()
  await expect(page).toHaveURL(/\/hub\/data\/sqlite-studio$/)
})
