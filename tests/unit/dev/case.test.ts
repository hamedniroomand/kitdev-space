import { describe, expect, it } from 'vitest'
import {
  convertLines,
  splitIntoWords,
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSlug,
  toSnakeCase,
} from '#shared/utils/dev/case'

describe('case utilities', () => {
  it('splits words correctly from various formats', () => {
    expect(splitIntoWords('helloWorld')).toEqual(['hello', 'World'])
    expect(splitIntoWords('Hello-World_123 test')).toEqual(['Hello', 'World', '123', 'test'])
    expect(splitIntoWords('XMLParser')).toEqual(['XML', 'Parser'])
    expect(splitIntoWords('')).toEqual([])
  })

  it('converts to camelCase', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld')
    expect(toCamelCase('Hello-World')).toBe('helloWorld')
    expect(toCamelCase('HELLO_WORLD')).toBe('helloWorld')
    expect(toCamelCase('')).toBe('')
  })

  it('converts to PascalCase', () => {
    expect(toPascalCase('hello world')).toBe('HelloWorld')
    expect(toPascalCase('hello_world')).toBe('HelloWorld')
    expect(toPascalCase('kebab-case-text')).toBe('KebabCaseText')
  })

  it('converts to snake_case', () => {
    expect(toSnakeCase('hello world')).toBe('hello_world')
    expect(toSnakeCase('HelloWorld')).toBe('hello_world')
    expect(toSnakeCase('hello-world-again')).toBe('hello_world_again')
  })

  it('converts to kebab-case', () => {
    expect(toKebabCase('hello world')).toBe('hello-world')
    expect(toKebabCase('HelloWorld')).toBe('hello-world')
    expect(toKebabCase('hello_world_test')).toBe('hello-world-test')
  })

  it('converts to CONSTANT_CASE', () => {
    expect(toConstantCase('hello world')).toBe('HELLO_WORLD')
    expect(toConstantCase('helloWorld')).toBe('HELLO_WORLD')
  })

  it('converts to URL slug with diacritics removal and trimming', () => {
    expect(toSlug('Hello World!')).toBe('hello-world')
    expect(toSlug('Café & Restaurant')).toBe('cafe-restaurant')
    expect(toSlug('   ---Multiple---hyphens and spaces---  ')).toBe('multiple-hyphens-and-spaces')
    expect(toSlug('')).toBe('')
  })

  it('splits unicode letters across non-Latin scripts', () => {
    expect(splitIntoWords('приветМир')).toEqual(['привет', 'Мир'])
    expect(splitIntoWords('مرحبا بالعالم')).toEqual(['مرحبا', 'بالعالم'])
  })

  it('splits words on acronym boundaries', () => {
    expect(splitIntoWords('XMLParser')).toEqual(['XML', 'Parser'])
    expect(splitIntoWords('parseHTML')).toEqual(['parse', 'HTML'])
    expect(splitIntoWords('getURLFromID')).toEqual(['get', 'URL', 'From', 'ID'])
    expect(splitIntoWords('HTML')).toEqual(['HTML'])
    expect(splitIntoWords('aB')).toEqual(['a', 'B'])
  })

  it('splits words on digit boundaries', () => {
    expect(splitIntoWords('v2Build')).toEqual(['v2', 'Build'])
    expect(splitIntoWords('v10Beta2')).toEqual(['v10', 'Beta2'])
    expect(splitIntoWords('9Lives')).toEqual(['9', 'Lives'])
  })

  it('splits words on mixed separators', () => {
    expect(splitIntoWords('report_final-draft version')).toEqual([
      'report',
      'final',
      'draft',
      'version',
    ])
    expect(splitIntoWords('  spaced   out  ')).toEqual(['spaced', 'out'])
  })

  it('keeps combining marks inside accented words', () => {
    // These accents are separate combining marks, not precomposed letters.
    expect(splitIntoWords('cafe\u0301Latte')).toEqual(['cafe\u0301', 'Latte'])
    expect(splitIntoWords('E\u0301coleNormale')).toEqual(['E\u0301cole', 'Normale'])
    expect(splitIntoWords('caf\u00E9AuLait')).toEqual(['caf\u00E9', 'Au', 'Lait'])
    expect(splitIntoWords('\u00C9coleNormale')).toEqual(['\u00C9cole', 'Normale'])
  })

  it('converts each line on its own', () => {
    expect(convertLines('hello world\nsecond line', toCamelCase)).toBe('helloWorld\nsecondLine')
    expect(convertLines('first one\r\nsecond one', toKebabCase)).toBe('first-one\r\nsecond-one')
    expect(convertLines('one\n\ntwo', toSnakeCase)).toBe('one\n\ntwo')
    expect(convertLines('trailing\n', toPascalCase)).toBe('Trailing\n')
    expect(convertLines('', toCamelCase)).toBe('')
  })

  it('transliterates special characters in toSlug', () => {
    expect(toSlug('Groß')).toBe('gross')
    expect(toSlug('København')).toBe('kobenhavn')
    expect(toSlug('Ægir')).toBe('aegir')
    expect(toSlug('Đorđe')).toBe('dorde')
    expect(toSlug('Łódź')).toBe('lodz')
  })
})
