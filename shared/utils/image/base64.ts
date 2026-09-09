/** A larger image can exhaust browser memory during decode. */
export const IMAGE_BASE64_MAX_BYTES = 10 * 1024 * 1024

export interface DataUriInfo {
  mimeType: string
  base64: string
  isDataUri: boolean
}

export function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/bmp': 'bmp',
  }
  return map[mime.toLowerCase()] || 'png'
}

export function parseDataUri(input: string): DataUriInfo {
  const trimmed = input.trim()
  const match = trimmed.match(/^data:([^;]+(?:;[^;]+)*?);base64,(.+)$/s)

  if (match && match[1] && match[2]) {
    const mimeType = match[1].split(';')[0]?.trim().toLowerCase() || 'image/png'
    return {
      mimeType,
      base64: match[2].trim(),
      isDataUri: true,
    }
  }

  // Pure base64 without prefix
  return {
    mimeType: 'image/png',
    base64: trimmed,
    isDataUri: false,
  }
}

/** Base64 writes 4 characters for each 3 bytes. */
export function base64ByteLength(base64: string): number {
  const clean = base64.replace(/\s/g, '')
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.floor(clean.length / 4) * 3 - padding
}

/** Returns an error message, or `null` when the input is Base64 within the size limit. */
export function validateImageBase64(input: string): string | null {
  const clean = parseDataUri(input).base64.replace(/\s/g, '')

  if (!clean) {
    return 'Add a Base64 string or a data URI.'
  }
  if (base64ByteLength(clean) > IMAGE_BASE64_MAX_BYTES) {
    return 'This image is larger than 10 MB. Use a smaller image.'
  }
  try {
    atob(clean)
  }
  catch {
    return 'This is not valid Base64 data. Check the input for a missing or an extra character.'
  }
  return null
}

export function formatAsHtmlImg(dataUri: string, alt = 'Embedded image'): string {
  return `<img src="${dataUri}" alt="${alt}" />`
}

export function formatAsCssBackground(dataUri: string): string {
  return `background-image: url('${dataUri}');`
}
