import {
  isAstLanguage,
  isResolveMode,
  parseSourceAst,
  resolveSpecifiers,
  transformSourceAst,
  type AstLanguage,
  type ResolveMode
} from '#server/utils/dev/ast'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface AstBody {
  mode?: string
  input?: string
  language?: string
  resolveMode?: string
  directory?: string
  specifiers?: string[]
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:ast')

  const body = await readBody<AstBody>(event)
  const mode = body.mode ?? 'parse'

  try {
    if (mode === 'parse') {
      const language = body.language ?? ''
      if (!isAstLanguage(language)) {
        throw createError({
          statusCode: 400,
          message: 'Choose a valid language: javascript, jsx, typescript, or tsx.'
        })
      }
      const result = parseSourceAst(body.input ?? '', language as AstLanguage)
      return { result }
    }

    if (mode === 'transform') {
      const language = body.language ?? ''
      if (!isAstLanguage(language)) {
        throw createError({
          statusCode: 400,
          message: 'Choose a valid language: javascript, jsx, typescript, or tsx.'
        })
      }
      const result = transformSourceAst(body.input ?? '', language as AstLanguage)
      return { result }
    }

    if (mode === 'resolve') {
      const resolveMode = (body.resolveMode ?? 'esm') as ResolveMode
      if (!isResolveMode(resolveMode)) {
        throw createError({
          statusCode: 400,
          message: 'Choose esm or node resolve mode.'
        })
      }
      const result = resolveSpecifiers({
        directory: body.directory,
        mode: resolveMode,
        specifiers: body.specifiers ?? []
      })
      return { result }
    }

    throw createError({
      statusCode: 400,
      message: 'Choose a valid mode: parse, transform, or resolve.'
    })
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'statusCode' in cause) {
      throw cause
    }
    const message = cause instanceof Error ? cause.message : 'The AST operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
