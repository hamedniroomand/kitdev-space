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

test('redirects legacy URLs to new hub tool URLs', async ({ page }) => {
  // Test renamed slug redirect
  await page.goto('/network/dns')
  await expect(page).toHaveURL(/\/hub\/network\/dns-lookup/)

  // Test renamed slug with query parameters
  await page.goto('/network/dns?type=MX')
  await expect(page).toHaveURL(/\/hub\/network\/dns-lookup\?type=MX/)

  // Test trailing slash
  await page.goto('/color/contrast/')
  await expect(page).toHaveURL(/\/hub\/color\/contrast-checker/)

  // Test same slug redirect
  await page.goto('/data/json-formatter')
  await expect(page).toHaveURL(/\/hub\/data\/json-formatter/)

  // Test category root redirect
  await page.goto('/crypto')
  await expect(page).toHaveURL(/\/hub\/crypto\/hash-generator/)

  // Test nested converter redirect
  await page.goto('/data/converters/json-yaml')
  await expect(page).toHaveURL(/\/hub\/data\/converters\/json-yaml/)
})

test('scrolling content area does not scroll the fixed sidebar', async ({ page }) => {
  await page.goto('/hub/data/json-formatter')

  const sidebar = page.locator('aside')
  await expect(sidebar).toBeVisible()

  // Scroll the main content area
  const main = page.locator('main')
  await main.evaluate((el) => {
    el.scrollTop = 500
  })

  // Window scroll remains 0
  const windowScrollY = await page.evaluate(() => window.scrollY)
  expect(windowScrollY).toBe(0)

  // Sidebar remains anchored right below the top navigation bar (56px)
  const sidebarBox = await sidebar.boundingBox()
  expect(sidebarBox?.y).toBe(56)
})
