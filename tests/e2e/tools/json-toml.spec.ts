import { expect, test } from '@playwright/test'
import { dropFile, fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON to TOML and downloads with .toml extension', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-toml')

  await fillCodeMirror(page, 'Input', '{"name": "KitDev", "ready": true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('name = "KitDev"')
  await expect(output).toContainText('ready = true')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('converted.toml')
})

test('loads dropped TOML file and updates target download extension to .json', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-toml')

  const tomlPayload = 'title = "From File"\nenabled = true\n'
  await dropFile(page, '.tool-editor', {
    name: 'config.toml',
    mimeType: 'application/toml',
    content: tomlPayload,
  })

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toContainText('title = "From File"')

  await page.getByRole('button', { name: 'Convert' }).click()
  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('"title": "From File"')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('converted.json')
})
