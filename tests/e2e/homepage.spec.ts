import { expect, test } from '@playwright/test'

test('homepage shows hero, value propositions, and Hub CTA', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Tools for people who build.' })).toBeVisible()
  await expect(page.getByText('Zero Tracking')).toBeVisible()
  await expect(page.getByText('No Accounts')).toBeVisible()
  await expect(page.getByText('Sub-10ms Native Speed')).toBeVisible()

  const hubCta = page.getByRole('link', { name: 'Open All Utilities in Hub' })
  await expect(hubCta).toBeVisible()
  await expect(hubCta).toHaveAttribute('href', '/hub')
})
