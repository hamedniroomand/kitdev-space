import type { CodeAction, CodeLanguage } from '#server/utils/dev/code-format'
import {

  isCodeAction,
  isCodeLanguage,
  processCode,
} from '#server/utils/dev/code-format'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface CodeFormatBody {
  input?: string
  language?: string
  action?: string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:code-format')

  const body = await readBody<CodeFormatBody>(event)
  const language = (body.language ?? '') as CodeLanguage
  const action = (body.action ?? '') as CodeAction

  if (!isCodeLanguage(language)) {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid language: javascript, typescript, html, css, or json.',
    })
  }

  if (!isCodeAction(action)) {
    throw createError({
      statusCode: 400,
      message: 'Choose minify or beautify.',
    })
  }

  try {
    const result = await processCode(body.input ?? '', language, action)
    return { result: result.code, engine: result.engine }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The format operation failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
