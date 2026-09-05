import { isHashAlgorithm, type HashAlgorithm } from '../../../shared/utils/crypto/types'
import { hashText } from '../../utils/crypto/hash'

const MAX_INPUT_CHARS = 500_000

interface HashBody {
  input?: string
  algorithm?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<HashBody>(event)
  const input = body.input ?? ''
  const algorithm = body.algorithm ?? ''

  if (!isHashAlgorithm(algorithm)) {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid hash algorithm.'
    })
  }

  if (input.length > MAX_INPUT_CHARS) {
    throw createError({
      statusCode: 413,
      message: 'Input is too large.'
    })
  }

  const result = hashText(input, algorithm as HashAlgorithm)
  return { result }
})
