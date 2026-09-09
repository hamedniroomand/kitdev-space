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

test('swaps output to input and reverses conversion direction', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  await fillCodeMirror(page, 'Input', '{"name": "KitDev", "ready": true}')
  await page.getByRole('button', { name: 'Convert' }).click()

  const output = page.getByRole('textbox', { name: 'Output' })
  await expect(output).toContainText('name: KitDev')

  await page.getByRole('button', { name: 'Swap', exact: true }).click()

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toContainText('name: KitDev')
  // An empty CodeMirror still renders its placeholder, so assert the old
  // output is gone instead of matching an empty string.
  await expect(output).not.toContainText('name: KitDev')

  await page.getByRole('button', { name: 'Convert' }).click()
  await expect(output).toContainText('"name": "KitDev"')
})

test('adapts sample input dynamically when format direction changes', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/converters/json-yaml')

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toContainText('"name":"KitDev"')

  await page.getByRole('button', { name: 'Swap formats' }).click()
  await expect(input).toContainText('name: KitDev')
})
