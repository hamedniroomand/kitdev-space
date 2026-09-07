import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('generates lorem ipsum text', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/lorem')

  const output = page.getByRole('textbox', { name: 'Output' })

  await test.step('generates default paragraphs', async () => {
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(output).toBeVisible()
    await expect(output).not.toBeEmpty()
  })

  await test.step('switches mode to words with custom count', async () => {
    const modeSelect = page.locator('select, [role="combobox"]').first()
    await modeSelect.click()
    await page.getByRole('option', { name: 'Words' }).click()

    const countInput = page.getByRole('spinbutton')
    await countInput.fill('5')
    await page.getByRole('button', { name: 'Generate' }).click()

    const text = (await output.textContent()) ?? ''
    const words = text.trim().split(/\s+/)
    expect(words.length).toBe(5)
  })

  await test.step('clears generated text', async () => {
    await page.getByRole('button', { name: 'Clear' }).click()
    const text = (await output.textContent()) ?? ''
    expect(text.replace('Result appears here', '').trim()).toBe('')
  })
})
