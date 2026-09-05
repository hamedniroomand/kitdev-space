import { expect, test } from '@playwright/test'

test('hub redirects /hub to default active tool /hub/data/json-formatter', async ({ page }) => {
  await page.goto('/hub')
  await expect(page).toHaveURL(/\/hub\/data\/json-formatter/)
  await expect(page.getByRole('heading', { name: 'JSON Formatter' })).toBeVisible()
})

test('hub persistent sidebar allows searching and switching tools', async ({ page }) => {
  await page.goto('/hub/data/json-formatter')

  // Sidebar elements
  await expect(page.getByPlaceholder('Search tools...').first()).toBeVisible()
  await expect(page.getByText('Data Lab').first()).toBeVisible()
  await expect(page.getByText('Network Lab').first()).toBeVisible()

  // Execution badges
  await expect(page.getByText('🔒 Client').first()).toBeVisible()

  // Filter tools by name
  await page.getByPlaceholder('Search tools...').first().fill('UUID')
  await expect(page.getByRole('link', { name: /UUID Generator/ }).first()).toBeVisible()

  // Switch tool via sidebar
  await page.getByRole('link', { name: /UUID Generator/ }).first().click()
  await expect(page).toHaveURL(/\/hub\/crypto\/uuid/)
  await expect(page.getByRole('heading', { name: 'UUID Generator' })).toBeVisible()

  // Return to landing page
  await page.getByRole('link', { name: 'Landing Page' }).first().click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Tools for people who build.' })).toBeVisible()
})
