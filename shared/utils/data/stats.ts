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
      speakingTimeMinutes: 0
    }
  }

  const characters = text.length
  const charactersWithoutSpaces = text.replace(/\s/g, '').length

  const wordsArray = text.trim().split(/\s+/).filter(Boolean)
  const words = text.trim() === '' ? 0 : wordsArray.length

  const lines = text.split('\n').length
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || 1

  const sentences = (text.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (words > 0 ? 1 : 0)
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
    speakingTimeMinutes
  }
}
