export interface TextStatistics {
  characters: number
  charactersWithoutSpaces: number
  words: number
  lines: number
  paragraphs: number
  sentences: number
  bytes: number
  readingTimeMinutes: number
  speakingTimeMinutes: number
}

export function getTextStats(text: string): TextStatistics {
  if (text.length === 0) {
    return {
      characters: 0,
      charactersWithoutSpaces: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0,
      bytes: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
    }
  }

  const characters = text.length
  const charactersWithoutSpaces = text.replace(/\s/g, '').length

  const wordsArray = text.trim().split(/\s+/).filter(Boolean)
  const words = text.trim() === '' ? 0 : wordsArray.length

  const normalizedLines = text.endsWith('\n') ? text.slice(0, -1) : text
  const lines = normalizedLines.split('\n').length
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length

  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || []
  let sentences = matches.length
  const lastPunctuation = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'))
  if (lastPunctuation !== -1) {
    const remainder = text.slice(lastPunctuation + 1).trim()
    if (remainder.length > 0 && /\S+/.test(remainder)) {
      sentences += 1
    }
  }
  else if (words > 0) {
    sentences = 1
  }

  const bytes = new TextEncoder().encode(text).length

  const readingTimeMinutes = Math.ceil(words / 200)
  const speakingTimeMinutes = Math.ceil(words / 130)

  return {
    characters,
    charactersWithoutSpaces,
    words,
    lines,
    paragraphs,
    sentences,
    bytes,
    readingTimeMinutes,
    speakingTimeMinutes,
  }
}

/** Writes a reading or speaking time as a short label. */
export function formatReadingTime(minutes: number, suffix = 'read'): string {
  return minutes <= 1 ? `< 1 min ${suffix}` : `${minutes} min ${suffix}`
}
