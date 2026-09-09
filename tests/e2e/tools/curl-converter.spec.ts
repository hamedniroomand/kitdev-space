import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test.describe('cURL to Code Converter Tool', () => {
  test('converts cURL to multiple languages and clears editors', { tag: '@smoke' }, async ({ page }) => {
    await gotoHydrated(page, '/hub/dev/curl-converter')

    const outputEditor = page.getByRole('textbox', { name: /Code$/ })

    await test.step('converts default sample cURL to Fetch code', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(outputEditor).toBeVisible()

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('fetch("https://api.example.com/v1/users"')
      expect(outputText).toContain('method: "POST"')
      expect(outputText).toContain('"Content-Type": "application/json"')
    })

    await test.step('switches target language to Axios and Python', async () => {
      await page.getByRole('button', { name: 'Axios', exact: true }).click()
      let outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('axios({')
      expect(outputText).toContain('https://api.example.com/v1/users')

      await page.getByRole('button', { name: 'Python Requests' }).click()
      outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('requests.post(')
      expect(outputText).toContain('url = "https://api.example.com/v1/users"')
    })

    await test.step('loads GET sample and updates conversion', async () => {
      await page.getByRole('button', { name: 'Load GET Sample' }).click()
      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText).toContain('api.example.com/v1/items?limit=10')
    })

    await test.step('shows the summary, the ignored options, and the mask', async () => {
      await fillCodeMirror(
        page,
        'cURL Command',
        'curl -k -b session=abc https://api.example.com/v1/ping -H "Authorization: Bearer top-secret"',
      )

      await expect(page.locator('div[aria-label="Method"]')).toContainText('GET')
      await expect(page.locator('div[aria-label="Target URL"]')).toContainText('https://api.example.com/v1/ping')
      await expect(page.locator('div[aria-label="Headers"]')).toContainText('1')
      await expect(page.locator('div[aria-label="Payload"]')).toContainText('0 B')

      await expect(page.getByText('Some cURL options are not in the code')).toBeVisible()
      await expect(page.getByText('The code sends no cookie.')).toBeVisible()
      await expect(page.getByText('The code validates the TLS certificate.')).toBeVisible()

      expect((await outputEditor.textContent()) ?? '').toContain('Bearer top-secret')

      await page.getByRole('switch', { name: 'Mask credentials' }).click()

      const maskedText = (await outputEditor.textContent()) ?? ''
      expect(maskedText).toContain('Bearer <redacted>')
      expect(maskedText).not.toContain('top-secret')
    })

    await test.step('clears input and output', async () => {
      const inputEditor = page.getByRole('textbox', { name: 'cURL Command' })

      await page.getByRole('button', { name: 'Clear' }).click()

      const inputText = (await inputEditor.textContent()) ?? ''
      expect(inputText.replace('Paste curl command here...', '').trim()).toBe('')

      const outputText = (await outputEditor.textContent()) ?? ''
      expect(outputText.replace('Converted code appears here...', '').trim()).toBe('')
    })
  })
})
