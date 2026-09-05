export function getTextStats(text: string) {
  return {
    characters: text.length,
    lines: text.length === 0 ? 0 : text.split('\n').length,
    bytes: new TextEncoder().encode(text).length
  }
}
