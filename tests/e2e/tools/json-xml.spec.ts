import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON and XML in both directions in the browser', { tag: '@smoke' }, async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    // Only the data route matters. Nuxt Icon loads icons through its own api route.
    if (request.url().includes('/api/data/')) {
      requests.push(request.url())
    }
  })

  await gotoHydrated(page, '/hub/data/converters/json-xml')

  const output = page.getByRole('textbox', { name: 'Output' })

  await test.step('converts JSON to XML in the browser', async () => {
    await expect(page.getByText('The data stays in your browser')).toBeVisible()
    await fillCodeMirror(page, 'Input', '{"name": "KitDev"}')
    await page.getByRole('button', { name: 'Convert' }).click()
    await expect(output).toContainText('<name>KitDev</name>')
    expect(requests).toEqual([])
  })

  await test.step('converts XML with attributes and CDATA to JSON', async () => {
    await page.getByRole('button', { name: 'Swap formats' }).click()
    await fillCodeMirror(page, 'Input', '<doc><note lang="en"><![CDATA[a < b]]></note><tag>x</tag><tag>y</tag></doc>')
    await page.getByRole('button', { name: 'Convert' }).click()
    await expect(output).toContainText('"@lang": "en"')
    await expect(output).toContainText('"#text": "a < b"')
    await expect(output).toContainText('"tag": [')
  })
})
