import { expect, test } from '@playwright/test'
import { dropFile, fillCodeMirror, gotoHydrated } from '../utils'

test('converts JSON to YAML and downloads with .yaml extension', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  await fillCodeMirror(page, 'Input', '{"name": "KitDev", "ready": true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('name: KitDev')
  await expect(output).toContainText('ready: true')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('converted.yaml')
})

test('loads dropped YAML file and updates target download extension to .json', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  const yamlPayload = 'title: From File\nenabled: true\n'
  await dropFile(page, '.tool-editor', {
    name: 'config.yaml',
    mimeType: 'text/yaml',
    content: yamlPayload,
  })

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toContainText('title: From File')

  await page.getByRole('button', { name: 'Convert' }).click()
  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('"title": "From File"')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('converted.json')
})
