import type { OgMetaTag, OgPreviewData, OgSource } from '#shared/utils/network/og-meta'
import { buildOgData } from '#shared/utils/network/og-meta'

/**
 * The browser half of the Open Graph reader. It lives in `app/` because
 * `DOMParser` is a DOM type, and `shared/` also compiles for the server.
 * The server collects its tags with `HTMLRewriter`. Both paths give their
 * tags to the one mapper, `buildOgData`, so the two results stay equal.
 */

/** True when the browser can read HTML with `DOMParser`. */
export function canExtractOgInBrowser(): boolean {
  return typeof DOMParser !== 'undefined'
}

/** Read the meta tags of an HTML string in the browser. */
export function readOgSourceFromHtml(html: string): OgSource {
  const document = new DOMParser().parseFromString(html, 'text/html')

  const tags: OgMetaTag[] = []
  for (const element of Array.from(document.querySelectorAll('meta'))) {
    const key = element.getAttribute('property') || element.getAttribute('name') || ''
    const content = element.getAttribute('content') || ''
    if (key && content) {
      tags.push({ key, content })
    }
  }

  return {
    tags,
    titleText: document.querySelector('title')?.textContent || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
  }
}

/** Extract the preview data of an HTML string in the browser. */
export function extractOgInBrowser(html: string, pageUrl: string): OgPreviewData {
  return buildOgData(readOgSourceFromHtml(html), pageUrl)
}
