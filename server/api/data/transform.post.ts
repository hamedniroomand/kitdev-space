import type { DataFormat } from '#shared/utils/data/types'
import { DataError } from '#shared/utils/data/errors'
import { transformWithBun } from '#server/utils/data/formats'

const MAX_INPUT_CHARS = 500_000

const formats = new Set<DataFormat>(['json', 'yaml', 'toml', 'xml', 'json5', 'typescript'])

interface TransformBody {
  input?: string
  from?: DataFormat
  to?: DataFormat
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TransformBody>(event)
  const input = body.input ?? ''
  const from = body.from
  const to = body.to

  if (!from || !to || !formats.has(from) || !formats.has(to)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Choose a valid source format and target format.'
    })
  }

  if (input.length > MAX_INPUT_CHARS) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Input is too large.'
    })
  }

  try {
    const result = transformWithBun(input, from, to)
    return { result }
  } catch (cause) {
    const message = cause instanceof DataError
      ? cause.message
      : 'The convert operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
