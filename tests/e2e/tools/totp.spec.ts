import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates time-based one-time passwords', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/crypto/totp')

  const codeContainer = page.locator('div[aria-label="One-time password"]')

  await test.step('generates default 6-digit passcode', async () => {
    await expect(page.getByText('Current One-Time Password', { exact: true })).toBeVisible()
    await expect(codeContainer).toBeVisible()
    const digits = (await codeContainer.textContent()) ?? ''
    expect(digits.replace(/\s+/g, '')).toMatch(/^\d{6}$/)
  })

  await test.step('exposes the countdown to assistive technology', async () => {
    await expect(codeContainer).toHaveAttribute('aria-live', 'polite')
    const bar = page.getByRole('progressbar', { name: 'Seconds until the next one-time password' })
    await expect(bar).toHaveAttribute('aria-valuemax', '30')
    await expect(bar).toHaveAttribute('aria-valuenow', /^\d+$/)
  })

  await test.step('masks the secret key', async () => {
    const secret = page.getByLabel('Base32 Secret or OTPAuth URI')
    await expect(secret).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show the secret key' }).click()
    await expect(secret).toHaveAttribute('type', 'text')
  })

  await test.step('switches to 8-digit passcode', async () => {
    await page.getByRole('button', { name: '8 Digits' }).click()
    const digits = (await codeContainer.textContent()) ?? ''
    expect(digits.replace(/\s+/g, '')).toMatch(/^\d{8}$/)
  })

  await test.step('switches hash algorithm', async () => {
    await page.getByLabel('Hash algorithm').click()
    await page.getByRole('option', { name: 'SHA-256' }).click()
    const digits = (await codeContainer.textContent()) ?? ''
    expect(digits.replace(/\s+/g, '')).toMatch(/^\d{8}$/)
  })

  await test.step('shows the otpauth uri', async () => {
    await expect(page.getByText(/^otpauth:\/\/totp\//).first()).toBeVisible()
  })

  await test.step('freezes the clock at a fixed test time', async () => {
    await page.getByLabel('Fixed test time').fill('2026-01-01T00:00:30')
    const frozen = (await codeContainer.textContent()) ?? ''
    await expect(page.getByText('The clock is frozen')).toBeVisible()
    await page.waitForTimeout(1500)
    expect((await codeContainer.textContent()) ?? '').toBe(frozen)
  })

  await test.step('generates random secret and clears', async () => {
    await page.getByRole('button', { name: 'Generate Random Secret' }).click()
    const digits = (await codeContainer.textContent()) ?? ''
    expect(digits.replace(/\s+/g, '')).toMatch(/^\d{8}$/)

    await page.getByRole('button', { name: 'Clear' }).click()
    await expect(codeContainer).not.toBeVisible()
  })
})
