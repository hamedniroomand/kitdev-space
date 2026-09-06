import { describe, expect, it } from 'vitest'
import {
  generateLoremParagraphs,
  generateLoremWords,
  generateMockUsers
} from '../../../shared/utils/data/lorem'

describe('lorem and mock data', () => {
  it('generates the requested word count', () => {
    const words = generateLoremWords(12).split(/\s+/)
    expect(words).toHaveLength(12)
  })

  it('generates paragraphs', () => {
    const text = generateLoremParagraphs(2)
    expect(text.split('\n\n')).toHaveLength(2)
  })

  it('generates mock user profiles', () => {
    const users = generateMockUsers(3)
    expect(users).toHaveLength(3)
    expect(users[0]).toMatchObject({
      name: expect.any(String),
      email: expect.stringContaining('@'),
      username: expect.any(String)
    })
  })
})
