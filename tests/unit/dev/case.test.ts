import { describe, expect, it } from 'vitest'
import {
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
})
