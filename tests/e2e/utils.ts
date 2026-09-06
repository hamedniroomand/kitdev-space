import type { Page } from '@playwright/test'

/**
 * Open a page and wait until Vue attaches its event listeners.
 *
 * The dev server sends unbundled modules, so hydration completes some seconds
 * after the server-rendered markup shows. A click or a fill that lands before
 * hydration does nothing. The network becomes quiet when all modules are
 * loaded, which is the condition that tells us the page is interactive.
 */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  }
  catch {
    // Ignore timeout when background requests remain active
  }
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
