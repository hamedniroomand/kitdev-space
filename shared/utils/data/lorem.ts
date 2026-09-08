const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'ut',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'ut',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'dolor',
  'in',
  'reprehenderit',
  'in',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'dolore',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'in',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
]

function randomInt(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % max
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function sentence(wordCount: number): string {
  const words: string[] = []
  for (let i = 0; i < wordCount; i += 1) {
    words.push(pick(LOREM_WORDS))
  }
  words[0] = capitalize(words[0]!)
  return `${words.join(' ')}.`
}

export type LoremMode = 'paragraphs' | 'sentences' | 'words'

export function generateLoremWords(count: number): string {
  const n = Math.floor(count)
  if (n < 1 || n > 5000) {
    throw new Error('Choose a word count between 1 and 5000.')
  }
  const words: string[] = []
  for (let i = 0; i < n; i += 1) {
    words.push(pick(LOREM_WORDS))
  }
  return words.join(' ')
}

export function generateLoremSentences(count: number): string {
  const n = Math.floor(count)
  if (n < 1 || n > 500) {
    throw new Error('Choose a sentence count between 1 and 500.')
  }
  const sentences: string[] = []
  for (let i = 0; i < n; i += 1) {
    const len = 6 + randomInt(10)
    sentences.push(sentence(len))
  }
  return sentences.join(' ')
}

export function generateLoremParagraphs(count: number, wordsPerParagraph = 40): string {
  const n = Math.floor(count)
  if (n < 1 || n > 50) {
    throw new Error('Choose a paragraph count between 1 and 50.')
  }
  const paragraphs: string[] = []
  for (let i = 0; i < n; i += 1) {
    const sentences: string[] = []
    let used = 0
    while (used < wordsPerParagraph) {
      const len = 6 + randomInt(10)
      sentences.push(sentence(len))
      used += len
    }
    paragraphs.push(sentences.join(' '))
  }
  return paragraphs.join('\n\n')
}

export function generateLorem(mode: LoremMode, count: number): string {
  switch (mode) {
    case 'paragraphs':
      return generateLoremParagraphs(count)
    case 'sentences':
      return generateLoremSentences(count)
    case 'words':
      return generateLoremWords(count)
  }
}
