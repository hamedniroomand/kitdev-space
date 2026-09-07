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

export function formatAsHtmlImg(dataUri: string, alt = 'Embedded image'): string {
  return `<img src="${dataUri}" alt="${alt}" />`
}

export function formatAsCssBackground(dataUri: string): string {
  return `background-image: url('${dataUri}');`
}
