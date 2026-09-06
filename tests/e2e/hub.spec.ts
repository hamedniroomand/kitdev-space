import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('hub shows Tools Hub landing at /hub', async ({ page }) => {
  await page.goto('/hub')
  await expect(page).toHaveURL(/\/hub\/?$/)
  await expect(page.getByRole('heading', { name: 'Tools Hub' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: /Data Lab/ })).toBeVisible()
})

test('hub category page lists tools', async ({ page }) => {
  await page.goto('/hub/data')
  await expect(page.getByRole('heading', { name: 'Data Lab' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: /JSON Formatter/ })).toBeVisible()
})

test('hub persistent sidebar allows searching and switching tools', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  // Sidebar elements
  await expect(page.getByRole('button', { name: 'Search tools' }).first()).toBeVisible()
  await expect(page.getByText('Data Lab').first()).toBeVisible()
  await expect(page.getByText('Network Lab').first()).toBeVisible()

  // Execution badges
  await expect(page.getByText('🔒 Client').first()).toBeVisible()

  // The sidebar search button opens the command palette
  await page.getByRole('button', { name: 'Search tools' }).first().click()
  await expect(page.getByPlaceholder('Search tools...')).toBeVisible()

  // Filter tools by name, then switch tool from the palette
  await page.getByPlaceholder('Search tools...').fill('ID & Secret')
  await page.getByRole('option', { name: /ID & Secret Generator/ }).first().click()
  await expect(page).toHaveURL(/\/hub\/crypto\/generator/)
  await expect(page.getByRole('heading', { name: 'Random ID and Secret Generator', level: 1 })).toBeVisible()

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
  await expect(page).toHaveURL(/\/hub\/crypto\/?$/)
  await expect(page.getByRole('heading', { name: 'Crypto Lab' })).toBeVisible()

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

test('clicking on a page from the sidebar scrolls content area to top', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const main = page.locator('main')
  // Scroll down
  await main.evaluate((el) => {
    el.scrollTop = 500
  })

  const scrolledTop = await main.evaluate(el => el.scrollTop)
  expect(scrolledTop).toBeGreaterThan(0)

  // Click on another tool from the sidebar
  await page.getByRole('link', { name: /ID & Secret Generator/ }).first().click()
  await expect(page).toHaveURL(/\/hub\/crypto\/generator/)

  // Content area must be scrolled back to top
  const resetTop = await main.evaluate(el => el.scrollTop)
  expect(resetTop).toBe(0)
})

test('clicking KitDev Space in the hub header navigates to the home page', async ({ page }) => {
  await page.goto('/hub/data/json-formatter')

  await page.getByRole('link', { name: 'KitDev Space' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Tools for people who build.' })).toBeVisible()
})
