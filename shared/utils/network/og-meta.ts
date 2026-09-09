/**
 * Meta tag extraction and audit for the OpenGraph tool.
 *
 * The browser reads the tags with `DOMParser`. The server reads the same tags
 * with `HTMLRewriter`. Both paths call `buildOgData` and `auditOgData`, so the
 * two paths give the same result.
 */

export interface OgPreviewData {
  title: string
  description: string
  image: string
  imageAlt: string
  url: string
  canonical: string
  siteName: string
  type: string
  twitterCard: string
}

/** One meta tag. The key is the `property` or the `name` attribute. */
export interface OgMetaTag {
  key: string
  content: string
}

/** The raw parts of a page that the audit needs. */
export interface OgSource {
  tags: OgMetaTag[]
  titleText: string
  canonical: string
}

/** The result of the image download. The browser path cannot make it. */
export interface OgImageProbe {
  url: string
  ok: boolean
  contentType: string | null
  byteSize: number | null
  width: number | null
  height: number | null
  error: string | null
}

export type OgFindingLevel = 'ok' | 'info' | 'warning' | 'error'

export interface OgFinding {
  id: string
  tag: string
  level: OgFindingLevel
  title: string
  detail: string
  /** The step that corrects the tag, or `null` when the tag is correct. */
  fix: string | null
}

/** The User-Agent strings that the fetch mode accepts. */
export const OG_USER_AGENTS = {
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KitDev/1.0',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitter: 'Twitterbot/1.0',
  linkedin: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)',
} as const

export type OgUserAgentKey = keyof typeof OG_USER_AGENTS

/** Map a key to a User-Agent string. An unknown key gives the browser string. */
export function resolveUserAgent(key: unknown): string {
  if (typeof key === 'string' && key in OG_USER_AGENTS) {
    return OG_USER_AGENTS[key as OgUserAgentKey]
  }
  return OG_USER_AGENTS.browser
}

export const TITLE_MAX_LENGTH = 60
export const DESCRIPTION_MAX_LENGTH = 200
export const IMAGE_MAX_BYTES = 5_000_000
export const IMAGE_MIN_SIDE = 200
export const IMAGE_BEST_WIDTH = 1200
export const IMAGE_BEST_HEIGHT = 630

const TWITTER_CARD_VALUES = new Set(['summary', 'summary_large_image', 'app', 'player'])

function firstValue(tags: OgMetaTag[], keys: string[]): string {
  for (const key of keys) {
    const tag = tags.find(item => item.key === key && item.content.trim() !== '')
    if (tag) {
      return tag.content.trim()
    }
  }
  return ''
}

function absoluteUrl(value: string, pageUrl: string): string {
  if (!value) {
    return ''
  }
  try {
    return new URL(value, pageUrl).href
  }
  catch {
    return value
  }
}

/** Build the preview data from the raw page parts. Both paths call this. */
export function buildOgData(source: OgSource, pageUrl: string): OgPreviewData {
  const tags = source.tags
    .map(tag => ({ key: tag.key.trim().toLowerCase(), content: tag.content }))
    .filter(tag => tag.key !== '' && tag.content.trim() !== '')

  const canonical = absoluteUrl(source.canonical.trim(), pageUrl)
  const declaredUrl = firstValue(tags, ['og:url'])

  return {
    title: firstValue(tags, ['og:title', 'twitter:title']) || source.titleText.trim(),
    description: firstValue(tags, ['og:description', 'description', 'twitter:description']),
    image: absoluteUrl(firstValue(tags, ['og:image', 'og:image:url', 'twitter:image']), pageUrl),
    imageAlt: firstValue(tags, ['og:image:alt', 'twitter:image:alt']),
    url: declaredUrl ? absoluteUrl(declaredUrl, pageUrl) : (canonical || pageUrl),
    canonical,
    siteName: firstValue(tags, ['og:site_name']),
    type: firstValue(tags, ['og:type']),
    twitterCard: firstValue(tags, ['twitter:card']),
  }
}

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

function finding(
  id: string,
  tag: string,
  level: OgFindingLevel,
  title: string,
  detail: string,
  fix: string | null = null,
): OgFinding {
  return { id, tag, level, title, detail, fix }
}

function auditImage(data: OgPreviewData, probe: OgImageProbe | null | undefined): OgFinding[] {
  if (!data.image) {
    return []
  }

  if (!probe) {
    return [finding(
      'image-not-checked',
      'og:image',
      'info',
      'The image is not checked',
      'The browser cannot download an image from another host. Use the URL mode to check the image file.',
    )]
  }

  if (!probe.ok) {
    return [finding(
      'image-unreachable',
      'og:image',
      'error',
      'The image download failed',
      probe.error || 'The server did not return the image.',
      'Publish the image at a public URL.',
    )]
  }

  const findings: OgFinding[] = []
  const contentType = (probe.contentType || '').toLowerCase()

  if (!contentType.startsWith('image/')) {
    findings.push(finding(
      'image-content-type',
      'og:image',
      'error',
      'The content type is not an image',
      `The server returned "${probe.contentType || 'no content type'}".`,
      'Return an image content type, such as image/png or image/jpeg.',
    ))
  }
  else {
    findings.push(finding('image-content-type', 'og:image', 'ok', 'The content type is an image', contentType))
  }

  if (probe.byteSize !== null && probe.byteSize > IMAGE_MAX_BYTES) {
    findings.push(finding(
      'image-size',
      'og:image',
      'warning',
      'The image file is large',
      `The file has ${probe.byteSize} bytes. Some platforms drop a file over ${IMAGE_MAX_BYTES} bytes.`,
      'Compress the image.',
    ))
  }

  if (probe.width === null || probe.height === null) {
    findings.push(finding(
      'image-dimensions',
      'og:image',
      'info',
      'The pixel size is unknown',
      'This format does not give the pixel size in the file header. SVG is one example.',
    ))
    return findings
  }

  const size = `${probe.width} x ${probe.height} pixels`

  if (probe.width < IMAGE_MIN_SIDE || probe.height < IMAGE_MIN_SIDE) {
    findings.push(finding(
      'image-dimensions',
      'og:image',
      'error',
      'The image is too small',
      `The image is ${size}. Platforms need at least ${IMAGE_MIN_SIDE} x ${IMAGE_MIN_SIDE} pixels.`,
      `Use an image of ${IMAGE_BEST_WIDTH} x ${IMAGE_BEST_HEIGHT} pixels.`,
    ))
    return findings
  }

  if (probe.width !== IMAGE_BEST_WIDTH || probe.height !== IMAGE_BEST_HEIGHT) {
    findings.push(finding(
      'image-dimensions',
      'og:image',
      'warning',
      'The pixel size is not the recommended size',
      `The image is ${size}.`,
      `Use ${IMAGE_BEST_WIDTH} x ${IMAGE_BEST_HEIGHT} pixels. Platforms cut a different shape.`,
    ))
    return findings
  }

  findings.push(finding('image-dimensions', 'og:image', 'ok', 'The pixel size is correct', size))
  return findings
}

/** Check the tags against the platform rules. */
export function auditOgData(data: OgPreviewData, probe?: OgImageProbe | null): OgFinding[] {
  const findings: OgFinding[] = []

  if (!data.title) {
    findings.push(finding(
      'title',
      'og:title',
      'error',
      'og:title is missing',
      'A card with no title shows the URL only.',
      'Add <meta property="og:title" content="...">.',
    ))
  }
  else if (data.title.length > TITLE_MAX_LENGTH) {
    findings.push(finding(
      'title',
      'og:title',
      'warning',
      'The title is long',
      `The title has ${data.title.length} characters.`,
      `Use ${TITLE_MAX_LENGTH} characters or less. Platforms cut a longer title.`,
    ))
  }
  else {
    findings.push(finding('title', 'og:title', 'ok', 'og:title is correct', `${data.title.length} characters.`))
  }

  if (!data.description) {
    findings.push(finding(
      'description',
      'og:description',
      'error',
      'og:description is missing',
      'A card with no description shows less context.',
      'Add <meta property="og:description" content="...">.',
    ))
  }
  else if (data.description.length > DESCRIPTION_MAX_LENGTH) {
    findings.push(finding(
      'description',
      'og:description',
      'warning',
      'The description is long',
      `The description has ${data.description.length} characters.`,
      `Use ${DESCRIPTION_MAX_LENGTH} characters or less. Platforms cut a longer description.`,
    ))
  }
  else {
    findings.push(finding('description', 'og:description', 'ok', 'og:description is correct', `${data.description.length} characters.`))
  }

  if (!data.image) {
    findings.push(finding(
      'image',
      'og:image',
      'error',
      'og:image is missing',
      'A card with no image gets less attention.',
      'Add <meta property="og:image" content="https://...">.',
    ))
  }
  else if (!/^https?:\/\//i.test(data.image)) {
    // The path stays relative only when the tool had no page URL to resolve it.
    // That is the paste mode with an empty page URL, and not a page error.
    const knownBase = /^https?:\/\//i.test(data.url)
    findings.push(finding(
      'image',
      'og:image',
      knownBase ? 'error' : 'info',
      knownBase ? 'og:image is not an absolute URL' : 'The og:image path is relative',
      `The tool read "${data.image}".`,
      knownBase
        ? 'Use a full URL that starts with https://.'
        : 'Enter the page URL, so the tool can resolve the path.',
    ))
  }
  else {
    findings.push(finding('image', 'og:image', 'ok', 'og:image is correct', data.image))
  }

  if (!data.twitterCard) {
    findings.push(finding(
      'twitter-card',
      'twitter:card',
      'warning',
      'twitter:card is missing',
      'X shows a small card when the tag is missing.',
      'Add <meta name="twitter:card" content="summary_large_image">.',
    ))
  }
  else if (!TWITTER_CARD_VALUES.has(data.twitterCard)) {
    findings.push(finding(
      'twitter-card',
      'twitter:card',
      'warning',
      'The twitter:card value is not standard',
      `The tool read "${data.twitterCard}".`,
      'Use summary or summary_large_image.',
    ))
  }
  else {
    findings.push(finding('twitter-card', 'twitter:card', 'ok', 'twitter:card is correct', data.twitterCard))
  }

  if (!data.canonical) {
    findings.push(finding(
      'canonical',
      'link[rel=canonical]',
      'warning',
      'The canonical link is missing',
      'A canonical link tells a platform which URL to show.',
      'Add <link rel="canonical" href="https://...">.',
    ))
  }
  else {
    findings.push(finding('canonical', 'link[rel=canonical]', 'ok', 'The canonical link is correct', data.canonical))
  }

  findings.push(...auditImage(data, probe))

  return findings
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function hasProblem(findings: OgFinding[], id: string): boolean {
  return findings.some(item => item.id === id && item.level !== 'ok' && item.level !== 'info')
}

/**
 * Build a corrected meta tag block.
 *
 * A correct value stays as it is. Only a missing or an incorrect value gets a
 * placeholder, so the snippet does not overwrite a custom tag that works.
 */
export function buildMetaTagSnippet(data: OgPreviewData, findings: OgFinding[]): string {
  const title = hasProblem(findings, 'title') ? 'Add a title of 60 characters or less' : data.title
  const description = hasProblem(findings, 'description')
    ? 'Add a description of 200 characters or less'
    : data.description
  const image = hasProblem(findings, 'image') || hasProblem(findings, 'image-content-type')
    ? 'https://example.com/og-image.png'
    : data.image
  const card = hasProblem(findings, 'twitter-card') ? 'summary_large_image' : data.twitterCard
  const canonical = data.canonical || data.url
  const type = data.type || 'website'

  const lines = [
    `<link rel="canonical" href="${escapeAttribute(canonical)}">`,
    `<meta property="og:type" content="${escapeAttribute(type)}">`,
    `<meta property="og:url" content="${escapeAttribute(data.url || canonical)}">`,
    `<meta property="og:title" content="${escapeAttribute(title)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    `<meta property="og:image" content="${escapeAttribute(image)}">`,
  ]

  if (data.siteName) {
    lines.push(`<meta property="og:site_name" content="${escapeAttribute(data.siteName)}">`)
  }
  if (data.imageAlt) {
    lines.push(`<meta property="og:image:alt" content="${escapeAttribute(data.imageAlt)}">`)
  }

  lines.push(`<meta name="twitter:card" content="${escapeAttribute(card)}">`)

  return lines.join('\n')
}
