import { parseSync } from 'oxc-parser'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { jsonToTypeScript } from '#shared/utils/data/typescript'
import { jsonToZod } from '#shared/utils/data/zod'

function evaluateZodSchema(code: string, schemaName: string): z.ZodTypeAny {
  const executableCode = code
    .split('\n')
    .filter(line => !line.trimStart().startsWith('import ') && !line.trimStart().startsWith('type ') && !line.trimStart().startsWith('export type '))
    .map(line => line.replace(/^export const /, 'const '))
    .join('\n')
  // eslint-disable-next-line no-new-func
  const fn = new Function('z', `${executableCode}\nreturn ${schemaName};`)
  return fn(z) as z.ZodTypeAny
}

describe('jsonToZod', () => {
  it('generates valid Zod schema for simple objects', () => {
    const input = { id: 1, name: 'KitDev', active: true }
    const output = jsonToZod(input, 'User')

    expect(output).toContain('import { z } from \'zod\'')
    expect(output).toContain('const userSchema = z.object({')
    expect(output).toContain('id: z.number(),')
    expect(output).toContain('name: z.string(),')
    expect(output).toContain('active: z.boolean(),')
    expect(output).toContain('type User = z.infer<typeof userSchema>')

    const parseResult = parseSync('user.ts', output)
    expect(parseResult.errors).toHaveLength(0)

    const schema = evaluateZodSchema(output, 'userSchema')
    const parsed = schema.parse(input)
    expect(parsed).toEqual(input)
  })

  it('generates valid Zod schema for nested objects and arrays', () => {
    const input = {
      id: 101,
      title: 'KitDev Project',
      tags: ['tools', 'developer'],
      author: {
        name: 'Hamed',
        verified: true,
      },
    }
    const output = jsonToZod(input, 'Article')

    const parseResult = parseSync('article.ts', output)
    expect(parseResult.errors).toHaveLength(0)

    const schema = evaluateZodSchema(output, 'articleSchema')
    const parsed = schema.parse(input)
    expect(parsed).toEqual(input)

    expect(() => schema.parse({ ...input, id: 'invalid-id' })).toThrow()
  })

  it('handles optional fields across array items', () => {
    const input = [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob' },
    ]
    const output = jsonToZod(input, 'Members')

    expect(output).toContain('role: z.string().optional(),')

    const parseResult = parseSync('members.ts', output)
    expect(parseResult.errors).toHaveLength(0)

    const schema = evaluateZodSchema(output, 'membersSchema')
    const parsed = schema.parse(input)
    expect(parsed).toEqual(input)
  })

  it('quotes property names that have special characters', () => {
    const input = {
      'content-type': 'application/json',
      'user name': 'Alice',
    }
    const output = jsonToZod(input, 'Headers')
    expect(output).toContain('\'content-type\': z.string(),')
    expect(output).toContain('\'user name\': z.string(),')

    const parseResult = parseSync('headers.ts', output)
    expect(parseResult.errors).toHaveLength(0)

    const schema = evaluateZodSchema(output, 'headersSchema')
    expect(schema.parse(input)).toEqual(input)
  })

  it('supports export and readonly modifiers', () => {
    const input = { id: 1 }
    const output = jsonToZod(input, {
      rootName: 'User',
      exportModifier: true,
      readonlyModifier: true,
    })
    expect(output).toContain('export const userSchema = z.object({')
    expect(output).toContain('id: z.number().readonly(),')
    expect(output).toContain('.readonly()')
    expect(output).toContain('export type User = z.infer<typeof userSchema>')

    const parseResult = parseSync('user.ts', output)
    expect(parseResult.errors).toHaveLength(0)
  })

  it('supports widenNull option', () => {
    const input = { nullable: null }
    const normalOutput = jsonToZod(input, { widenNull: false })
    expect(normalOutput).toContain('nullable: z.null(),')

    const widenedOutput = jsonToZod(input, { widenNull: true })
    expect(widenedOutput).toContain('nullable: z.null().or(z.unknown()),')

    const schema = evaluateZodSchema(widenedOutput, 'rootSchema')
    expect(schema.parse({ nullable: null })).toEqual({ nullable: null })
    expect(schema.parse({ nullable: 'arbitrary' })).toEqual({ nullable: 'arbitrary' })
  })

  it('exports Zod schema through jsonToTypeScript exportMode', () => {
    const input = { count: 5 }
    const output = jsonToTypeScript(input, { rootName: 'Counter', exportMode: 'zod' })
    expect(output).toContain('import { z } from \'zod\'')
    expect(output).toContain('const counterSchema = z.object({')
    expect(output).toContain('count: z.number(),')
  })
})
