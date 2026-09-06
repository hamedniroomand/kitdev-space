export interface UnicodeCharInfo {
  char: string
  displayChar: string
  codePoint: number
  hex: string
  utf8Bytes: string[]
  utf16Hex: string[]
  isControl: boolean
  isWhitespace: boolean
  isZeroWidth: boolean
  category: string
}

export interface UnicodeAnalysis {
  totalChars: number
  totalCodePoints: number
  hasZeroWidth: boolean
  hasControlChars: boolean
  normalization: {
    nfc: string
    nfd: string
    nfkc: string
    nfkd: string
    isNfc: boolean
    isNfd: boolean
  }
  chars: UnicodeCharInfo[]
}

const ZERO_WIDTH_NAMES: Record<number, string> = {
  0x200b: 'Zero-Width Space (ZWSP)',
  0x200c: 'Zero-Width Non-Joiner (ZWNJ)',
  0x200d: 'Zero-Width Joiner (ZWJ)',
  0x200e: 'Left-to-Right Mark (LRM)',
  0x200f: 'Right-to-Left Mark (RLM)',
  0x2060: 'Word Joiner (WJ)',
  0xfeff: 'Zero-Width No-Break Space (BOM)'
}

function getUtf8Bytes(str: string): string[] {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  return Array.from(bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0'))
}

function getUtf16Hex(str: string): string[] {
  const result: string[] = []
  for (let i = 0; i < str.length; i++) {
    result.push(`0x${str.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')}`)
  }
  return result
}

function getCharCategory(codePoint: number): string {
  if (ZERO_WIDTH_NAMES[codePoint]) {
    return ZERO_WIDTH_NAMES[codePoint]
  }
  if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
    return 'Control Character'
  }
  if (codePoint >= 0x20 && codePoint <= 0x7e) {
    return 'Basic Latin (ASCII)'
  }
  if (codePoint >= 0x80 && codePoint <= 0xff) {
    return 'Latin-1 Supplement'
  }
  if (codePoint >= 0x0100 && codePoint <= 0x024f) {
    return 'Latin Extended'
  }
  if (codePoint >= 0x0370 && codePoint <= 0x03ff) {
    return 'Greek and Coptic'
  }
  if (codePoint >= 0x0400 && codePoint <= 0x04ff) {
    return 'Cyrillic'
  }
  if (codePoint >= 0x0600 && codePoint <= 0x06ff) {
    return 'Arabic'
  }
  if (codePoint >= 0x0590 && codePoint <= 0x05ff) {
    return 'Hebrew'
  }
  if (codePoint >= 0x3000 && codePoint <= 0x9fff) {
    return 'CJK Symbols & Ideographs'
  }
  if (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) {
    return 'Emoji & Symbols'
  }
  return 'Unicode Character'
}

export function inspectUnicode(input: string): UnicodeAnalysis {
  // Use spread or Array.from to correctly iterate by Unicode code point (surrogate pairs intact)
  const codePointsArray = Array.from(input)
  let hasZeroWidth = false
  let hasControlChars = false

  const chars: UnicodeCharInfo[] = codePointsArray.map((ch) => {
    const codePoint = ch.codePointAt(0) ?? 0
    const hex = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
    const isZeroWidth = !!ZERO_WIDTH_NAMES[codePoint]
    const isControl = (codePoint <= 0x1f && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d)
      || (codePoint >= 0x7f && codePoint <= 0x9f)
    const isWhitespace = /\s/.test(ch)

    if (isZeroWidth) hasZeroWidth = true
    if (isControl) hasControlChars = true

    let displayChar = ch
    const zeroWidthName = ZERO_WIDTH_NAMES[codePoint]
    if (isZeroWidth && zeroWidthName) {
      displayChar = `[${zeroWidthName.split(' ')[0]}]`
    } else if (codePoint === 0x20) {
      displayChar = '[Space]'
    } else if (codePoint === 0x09) {
      displayChar = '[Tab]'
    } else if (codePoint === 0x0a) {
      displayChar = '[LF]'
    } else if (codePoint === 0x0d) {
      displayChar = '[CR]'
    } else if (isControl) {
      displayChar = `[Control ${hex}]`
    }

    return {
      char: ch,
      displayChar,
      codePoint,
      hex,
      utf8Bytes: getUtf8Bytes(ch),
      utf16Hex: getUtf16Hex(ch),
      isControl,
      isWhitespace,
      isZeroWidth,
      category: getCharCategory(codePoint)
    }
  })

  const nfc = input.normalize('NFC')
  const nfd = input.normalize('NFD')
  const nfkc = input.normalize('NFKC')
  const nfkd = input.normalize('NFKD')

  return {
    totalChars: input.length,
    totalCodePoints: codePointsArray.length,
    hasZeroWidth,
    hasControlChars,
    normalization: {
      nfc,
      nfd,
      nfkc,
      nfkd,
      isNfc: input === nfc,
      isNfd: input === nfd
    },
    chars
  }
}
