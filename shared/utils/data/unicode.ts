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
  0x200B: 'Zero-Width Space (ZWSP)',
  0x200C: 'Zero-Width Non-Joiner (ZWNJ)',
  0x200D: 'Zero-Width Joiner (ZWJ)',
  0x200E: 'Left-to-Right Mark (LRM)',
  0x200F: 'Right-to-Left Mark (RLM)',
  0x2060: 'Word Joiner (WJ)',
  0xFEFF: 'Zero-Width No-Break Space (BOM)',
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
  if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
    return 'Control Character'
  }
  if (codePoint >= 0x20 && codePoint <= 0x7E) {
    return 'Basic Latin (ASCII)'
  }
  if (codePoint >= 0x80 && codePoint <= 0xFF) {
    return 'Latin-1 Supplement'
  }
  if (codePoint >= 0x0100 && codePoint <= 0x024F) {
    return 'Latin Extended'
  }
  if (codePoint >= 0x0370 && codePoint <= 0x03FF) {
    return 'Greek and Coptic'
  }
  if (codePoint >= 0x0400 && codePoint <= 0x04FF) {
    return 'Cyrillic'
  }
  if (codePoint >= 0x0600 && codePoint <= 0x06FF) {
    return 'Arabic'
  }
  if (codePoint >= 0x0590 && codePoint <= 0x05FF) {
    return 'Hebrew'
  }
  if (codePoint >= 0x3000 && codePoint <= 0x9FFF) {
    return 'CJK Symbols & Ideographs'
  }
  if (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) {
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
    const isControl = (codePoint <= 0x1F && codePoint !== 0x09 && codePoint !== 0x0A && codePoint !== 0x0D)
      || (codePoint >= 0x7F && codePoint <= 0x9F)
    const isWhitespace = /\s/.test(ch)

    if (isZeroWidth)
      hasZeroWidth = true
    if (isControl)
      hasControlChars = true

    let displayChar = ch
    const zeroWidthName = ZERO_WIDTH_NAMES[codePoint]
    if (isZeroWidth && zeroWidthName) {
      displayChar = `[${zeroWidthName.split(' ')[0]}]`
    }
    else if (codePoint === 0x20) {
      displayChar = '[Space]'
    }
    else if (codePoint === 0x09) {
      displayChar = '[Tab]'
    }
    else if (codePoint === 0x0A) {
      displayChar = '[LF]'
    }
    else if (codePoint === 0x0D) {
      displayChar = '[CR]'
    }
    else if (isControl) {
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
      category: getCharCategory(codePoint),
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
      isNfd: input === nfd,
    },
    chars,
  }
}

export interface UnicodeGraphemeCluster {
  grapheme: string
  codePoints: UnicodeCharInfo[]
  isMultiCodePoint: boolean
}

/**
 * Groups input into grapheme clusters using Intl.Segmenter.
 * ZWJ sequences are stored as a single cluster with multiple code points.
 */
export function groupGraphemes(input: string): UnicodeGraphemeCluster[] {
  if (!input) {
    return []
  }

  const segmenter = (typeof Intl !== 'undefined' && 'Segmenter' in Intl)
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

  const analysis = inspectUnicode(input)
  const codePointMap = new Map<number, UnicodeCharInfo>()
  let offset = 0
  for (const cp of analysis.chars) {
    codePointMap.set(offset, cp)
    offset += cp.char.length
  }

  if (!segmenter) {
    // Fallback: each code point is one cluster
    return analysis.chars.map(cp => ({
      grapheme: cp.char,
      codePoints: [cp],
      isMultiCodePoint: false,
    }))
  }

  const clusters: UnicodeGraphemeCluster[] = []
  for (const segment of segmenter.segment(input)) {
    const graphemeChars = [...segment.segment]
    const cpInfos = graphemeChars.map((ch) => {
      const cp = ch.codePointAt(0) ?? 0
      const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
      const isZeroWidth = !!ZERO_WIDTH_NAMES[cp]
      const isControl = (cp <= 0x1F && cp !== 0x09 && cp !== 0x0A && cp !== 0x0D)
        || (cp >= 0x7F && cp <= 0x9F)
      let displayChar = ch
      if (isZeroWidth) {
        displayChar = `[${(ZERO_WIDTH_NAMES[cp] ?? '').split(' ')[0]}]`
      }
      return {
        char: ch,
        displayChar,
        codePoint: cp,
        hex,
        utf8Bytes: getUtf8Bytes(ch),
        utf16Hex: getUtf16Hex(ch),
        isControl,
        isWhitespace: /\s/.test(ch),
        isZeroWidth,
        category: getCharCategory(cp),
      }
    })
    clusters.push({
      grapheme: segment.segment,
      codePoints: cpInfos,
      isMultiCodePoint: graphemeChars.length > 1,
    })
  }
  return clusters
}

// Security-relevant code point ranges
const BIDI_CONTROLS = new Set([
  0x202A,
  0x202B,
  0x202C,
  0x202D,
  0x202E, // LRE, RLE, PDF, LRO, RLO
  0x2066,
  0x2067,
  0x2068,
  0x2069, // LRI, RLI, FSI, PDI
])

const SECURITY_CHARS = new Set([
  0x00AD, // Soft hyphen
  0x200B, // Zero-width space
  0x200C, // Zero-width non-joiner
  0x200D, // Zero-width joiner
  0x2060, // Word joiner
  0xFEFF, // BOM / zero-width no-break space
])

// Tag characters U+E0000 to U+E007F
function isTagChar(cp: number): boolean {
  return cp >= 0xE0000 && cp <= 0xE007F
}

// Variation selectors U+FE00–FE0F and U+E0100–E01EF
function isVariationSelector(cp: number): boolean {
  return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF)
}

export interface SecurityDiagnostic {
  codePoint: number
  hex: string
  description: string
  kind: 'bidi' | 'invisible' | 'tag' | 'variation' | 'mixed-script'
}

/**
 * Scans text for bidi overrides, soft hyphens, zero-width spaces, variation
 * selectors, tag characters, and mixed Latin/Cyrillic homoglyphs.
 */
export function detectSecurityChars(input: string): SecurityDiagnostic[] {
  const diagnostics: SecurityDiagnostic[] = []
  const codePoints = [...input]

  let hasLatin = false
  let hasCyrillic = false

  for (const ch of codePoints) {
    const cp = ch.codePointAt(0) ?? 0
    const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

    if (BIDI_CONTROLS.has(cp)) {
      diagnostics.push({
        codePoint: cp,
        hex,
        description: `Bidirectional control character ${hex} — can reverse displayed text direction.`,
        kind: 'bidi',
      })
    }
    else if (SECURITY_CHARS.has(cp)) {
      diagnostics.push({
        codePoint: cp,
        hex,
        description: `Invisible character ${hex} — not visible but present in data.`,
        kind: 'invisible',
      })
    }
    else if (isTagChar(cp)) {
      diagnostics.push({
        codePoint: cp,
        hex,
        description: `Tag character ${hex} — used in hidden tag sequences.`,
        kind: 'tag',
      })
    }
    else if (isVariationSelector(cp)) {
      diagnostics.push({
        codePoint: cp,
        hex,
        description: `Variation selector ${hex} — selects glyph variant of preceding character.`,
        kind: 'variation',
      })
    }

    // Mixed-script tracking
    if (cp >= 0x0041 && cp <= 0x007A)
      hasLatin = true // Basic Latin letters
    if (cp >= 0x0400 && cp <= 0x04FF)
      hasCyrillic = true // Cyrillic block
  }

  if (hasLatin && hasCyrillic) {
    diagnostics.push({
      codePoint: 0,
      hex: 'N/A',
      description: 'Mixed Latin and Cyrillic characters detected — possible homoglyph substitution.',
      kind: 'mixed-script',
    })
  }

  return diagnostics
}

/**
 * Removes invisible characters from text without altering visible content.
 * The original input is never modified; this function returns a new string.
 */
export function removeInvisibleChars(input: string): string {
  const INVISIBLE = new Set([
    0x200B, // Zero-width space
    0x200C, // Zero-width non-joiner
    0x200D, // Zero-width joiner
    0x200E, // Left-to-right mark
    0x200F, // Right-to-left mark
    0x2060, // Word joiner
    0xFEFF, // BOM / zero-width no-break space
    0x00AD, // Soft hyphen
    ...Array.from({ length: 5 }, (_, i) => 0x202A + i), // Bidi embeds/overrides
    ...Array.from({ length: 4 }, (_, i) => 0x2066 + i), // Bidi isolates
  ])

  return [...input]
    .filter(ch => !INVISIBLE.has(ch.codePointAt(0) ?? 0))
    .join('')
}

export interface EscapeFormats {
  jsUnicode: string
  jsCodePoint: string
  htmlEntity: string
  css: string
  python: string
  url: string
}

/**
 * Returns escape sequences in multiple programming languages for a single
 * code point character.
 */
export function getEscapeFormats(ch: string): EscapeFormats {
  const cp = ch.codePointAt(0) ?? 0
  const hexLower = cp.toString(16).toLowerCase()
  const hexUpper = hexLower.toUpperCase()
  const hex4 = hexLower.padStart(4, '0')

  // JavaScript \uXXXX (BMP only) or surrogate pair
  let jsUnicode: string
  if (cp <= 0xFFFF) {
    jsUnicode = `\\u${hexUpper.padStart(4, '0')}`
  }
  else {
    // Surrogate pair encoding
    const offset = cp - 0x10000
    const high = (0xD800 + (offset >> 10)).toString(16).toUpperCase().padStart(4, '0')
    const low = (0xDC00 + (offset & 0x3FF)).toString(16).toUpperCase().padStart(4, '0')
    jsUnicode = `\\u${high}\\u${low}`
  }

  const jsCodePoint = `\\u{${hexLower}}`
  const htmlEntity = `&#x${hexUpper};`
  const css = `\\${hex4}`
  const python = cp <= 0xFFFF ? `\\u${hexUpper.padStart(4, '0')}` : `\\U${hexUpper.padStart(8, '0')}`
  const url = encodeURIComponent(ch)

  return { jsUnicode, jsCodePoint, htmlEntity, css, python, url }
}
