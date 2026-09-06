import { expect, test } from '@playwright/test'
import { fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON to TypeScript interfaces', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-to-typescript')

  await fillCodeMirror(page, 'Input', '{\n  "id": 1,\n  "title": "KitDev",\n  "active": true\n}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('interface Root')
  await expect(output).toContainText('id: number')
  await expect(output).toContainText('title: string')
  await expect(output).toContainText('active: boolean')
})
