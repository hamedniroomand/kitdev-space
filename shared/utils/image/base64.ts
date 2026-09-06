export interface DataUriInfo {
  mimeType: string
  base64: string
  isDataUri: boolean
}

export function parseDataUri(input: string): DataUriInfo {
  const trimmed = input.trim()
  const match = trimmed.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/)

  if (match && match[1] && match[2]) {
    return {
      mimeType: match[1],
      base64: match[2],
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
