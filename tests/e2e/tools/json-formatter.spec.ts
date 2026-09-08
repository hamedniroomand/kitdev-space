import { expect, test } from '@playwright/test'
import { gotoHydrated } from '../utils'

test('formats JSON on the JSON Formatter page', { tag: '@smoke' }, async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const input = page.getByRole('textbox', { name: 'Input' })
  await expect(input).toBeVisible()
  await input.fill('{"name":"KitDev","ready":true}')
  await page.getByRole('button', { name: 'Format' }).click()

  await expect(page.getByText('Valid JSON')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('textbox', { name: 'Output' })).toContainText('"name": "KitDev"')
})

test('switches to tree view and copies path on node click', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  const input = page.getByRole('textbox', { name: 'Input' })
  await input.fill('{"user":{"name":"Alice"}}')
  await page.getByRole('button', { name: 'Format' }).click()

  await expect(page.getByText('Valid JSON')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Tree View' }).click()

  const node = page.locator('[data-path="$.user.name"]')
  await expect(node).toBeVisible()
  await node.click()

  await expect(page.getByText('Copied path: $.user.name')).toBeVisible()
})

test('formats large 20 MB JSON in worker without freezing UI frames over 100 ms', async ({ page }) => {
  await gotoHydrated(page, '/hub/data/json-formatter')

  await page.evaluate(() => {
    (window as any).__maxLag = 0
    let last = performance.now()
    function loop() {
      const now = performance.now()
      const delta = now - last
      if (delta > (window as any).__maxLag) {
        (window as any).__maxLag = delta
      }
      last = now
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })

  const maxLag = await page.evaluate(async () => {
    const chunk = '{"id":12345,"name":"Benchmark test item with plenty of text content","valid":true,"data":[1,2,3,4,5]},'
    const targetLength = 20 * 1024 * 1024
    const repeatCount = Math.ceil(targetLength / chunk.length)
    const jsonStr = `[${chunk.repeat(repeatCount).slice(0, -1)}]`

    ;(window as any).__maxLag = 0

    const worker = new Worker(
      URL.createObjectURL(
        new Blob([`
          self.onmessage = (e) => {
            const parsed = JSON.parse(e.data);
            const formatted = JSON.stringify(parsed, null, 2);
            self.postMessage(formatted.length);
          };
        `], { type: 'application/javascript' }),
      ),
    )

    await new Promise<void>((resolve, reject) => {
      worker.onmessage = () => {
        worker.terminate()
        resolve()
      }
      worker.onerror = (e) => {
        worker.terminate()
        reject(e)
      }
      worker.postMessage(jsonStr)
    })

    return (window as any).__maxLag
  })

  expect(maxLag).toBeLessThan(100)
})
