import type { Page } from '@playwright/test'

/**
 * Open a page and wait until Vue has hydrated it.
 *
 * A click or a fill that lands before hydration does nothing. The client
 * plugin `hydrated.client.ts` sets `data-hydrated` on the root element when
 * the app has mounted, so the wait is exact and does not depend on the network.
 */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 10_000 })
}

/**
 * Fill text into a CodeMirror editor with the given accessibility label.
 */
export async function fillCodeMirror(page: Page, label: string, text: string) {
  const editor = page.getByRole('textbox', { name: label })
  await editor.waitFor({ state: 'visible' })
  await editor.fill(text)
}

/**
 * Read the text content of a CodeMirror editor with the given accessibility label.
 */
export async function getCodeMirrorValue(page: Page, label: string): Promise<string> {
  const editor = page.getByRole('textbox', { name: label })
  await editor.waitFor({ state: 'visible' })
  return (await editor.textContent()) ?? ''
}

/**
 * Simulate dropping a text or data file onto an element.
 */
export async function dropFile(
  page: Page,
  selector: string,
  file: { name: string, mimeType: string, content: string },
) {
  const dataTransfer = await page.evaluateHandle(
    ({ content, name, mimeType }) => {
      const dt = new DataTransfer()
      const blob = new Blob([content], { type: mimeType })
      const f = new File([blob], name, { type: mimeType })
      dt.items.add(f)
      return dt
    },
    { content: file.content, name: file.name, mimeType: file.mimeType },
  )

  await page.dispatchEvent(selector, 'drop', { dataTransfer })
}
