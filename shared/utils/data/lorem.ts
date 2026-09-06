const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
  'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id',
  'est', 'laborum'
]

const FIRST_NAMES = [
  'Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Iris', 'Owen', 'Nora', 'Leo',
  'Ruby', 'Kai', 'Elena', 'Jonah', 'Sofia', 'Marcus', 'Hana', 'Felix', 'Amir', 'Clara'
]

const LAST_NAMES = [
  'Stone', 'Rivera', 'Nguyen', 'Patel', 'Brooks', 'Kim', 'Costa', 'Walsh', 'Okada', 'Berg',
  'Silva', 'Hassan', 'Cho', 'Murray', 'Vega', 'Anders', 'Park', 'Singh', 'Keller', 'Duarte'
]

const DOMAINS = ['example.com', 'mail.test', 'dev.local', 'sample.org']

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

export interface MockUserProfile {
  id: string
  name: string
  email: string
  username: string
  age: number
  city: string
  active: boolean
}

const CITIES = [
  'Berlin', 'Lisbon', 'Tokyo', 'Toronto', 'Cairo', 'Oslo', 'Seoul', 'Austin', 'Lyon', 'Zurich'
]

export function generateMockUsers(count: number): MockUserProfile[] {
  const n = Math.floor(count)
  if (n < 1 || n > 100) {
    throw new Error('Choose a profile count between 1 and 100.')
  }

  const users: MockUserProfile[] = []
  for (let i = 0; i < n; i += 1) {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    const username = `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(90) + 10}`
    users.push({
      id: crypto.randomUUID(),
      name: `${first} ${last}`,
      email: `${username}@${pick(DOMAINS)}`,
      username,
      age: 18 + randomInt(50),
      city: pick(CITIES),
      active: randomInt(2) === 1
    })
  }
  return users
}
