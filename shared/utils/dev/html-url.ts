export function urlEncode(input: string): string {
  return encodeURIComponent(input)
}

export function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input)
  }
  catch {
    return decodeURI(input)
  }
}

export function htmlEntityEncode(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&apos;': '\'',
  '&nbsp;': ' ',
}

export function htmlEntityDecode(input: string): string {
  let result = input.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#39);/g,
    match => HTML_ENTITY_MAP[match] ?? match,
  )

  // Handle decimal entities &#123;
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    const code = Number.parseInt(dec, 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : _
  })

  // Handle hex entities &#x1f;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = Number.parseInt(hex, 16)
    return Number.isFinite(code) ? String.fromCodePoint(code) : _
  })

  return result
}
