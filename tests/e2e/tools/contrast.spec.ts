import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('checks color contrast ratio and WCAG rating', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/color/contrast-checker')

  const textField = page.getByRole('textbox', { name: 'Text', exact: true })
  const backgroundField = page.getByRole('textbox', { name: 'Background', exact: true })

  await test.step('displays initial contrast ratio', async () => {
    await expect(page.getByText('Normal text', { exact: true })).toBeVisible()
    await expect(page.getByText('Large text', { exact: true })).toBeVisible()
    await expect(page.getByText('5.70:1', { exact: true })).toBeVisible()
  })

  await test.step('recalculates the ratio while the user types', async () => {
    await textField.fill('#000000')
    await backgroundField.fill('#ffffff')

    await expect(page.getByText('21.00:1', { exact: true })).toBeVisible()
  })

  await test.step('swaps the color pair', async () => {
    await page.getByRole('button', { name: 'Swap the text color and the background' }).click()

    await expect(textField).toHaveValue('#ffffff')
    await expect(backgroundField).toHaveValue('#000000')
    await expect(page.getByText('21.00:1', { exact: true })).toBeVisible()
  })

  await test.step('applies the suggested lightness fix', async () => {
    await textField.fill('#777777')
    await backgroundField.fill('#888888')

    const applyAa = page.getByRole('button', { name: 'Apply AA fix' })
    await expect(applyAa).toBeVisible()
    await applyAa.click()

    await expect(textField).toHaveValue('#212121')
    await expect(page.getByText('4.54:1', { exact: true })).toBeVisible()
  })

  await test.step('resets to the default pair', async () => {
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByText('5.70:1', { exact: true })).toBeVisible()
  })

  await test.step('shows the draft APCA score', async () => {
    const toggle = page.getByRole('switch', { name: 'Show the APCA score' })
    await expect(page.getByText('Lc -82.8', { exact: true })).not.toBeVisible()

    await toggle.click()

    await expect(page.getByText('Lc -82.8', { exact: true })).toBeVisible()
    await expect(page.getByText('Body text, 14px regular and larger')).toBeVisible()
  })
})

test('loads a color pair from a shared link', async ({ page }) => {
  await gotoHydrated(page, '/hub/color/contrast-checker?fg=%23000000&bg=%23ffffff')

  await expect(page.getByRole('textbox', { name: 'Text', exact: true })).toHaveValue('#000000')
  await expect(page.getByRole('textbox', { name: 'Background', exact: true })).toHaveValue('#ffffff')
  await expect(page.getByText('21.00:1', { exact: true })).toBeVisible()
})
