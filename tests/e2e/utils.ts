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
  await page.waitForLoadState('networkidle')
}
