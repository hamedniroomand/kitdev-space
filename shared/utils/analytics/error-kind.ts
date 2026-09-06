export type ErrorKind = 'validation' | 'network' | 'server' | 'clipboard' | 'unsupported' | 'unknown'

interface ErrorShape {
  name?: string
  status?: number
  statusCode?: number
  response?: { status?: number }
}

function statusOf(cause: ErrorShape): number | undefined {
  return cause.statusCode ?? cause.status ?? cause.response?.status
}

/**
 * Classifies an error by its shape, never by its message. A message can hold
 * user input, so it must not reach analytics.
 */
export function errorKind(cause: unknown): ErrorKind {
  if (!cause || typeof cause !== 'object') {
    return 'unknown'
  }
  const shape = cause as ErrorShape
  const status = statusOf(shape)

  if (status !== undefined) {
    if (status === 400 || status === 422) {
      return 'validation'
    }
    if (status >= 500) {
      return 'server'
    }
    return 'unknown'
  }

  switch (shape.name) {
    case 'DataError':
    case 'SyntaxError':
    case 'RangeError':
      return 'validation'
    case 'FetchError':
    case 'AbortError':
    case 'TimeoutError':
    case 'NetworkError':
      return 'network'
    case 'NotSupportedError':
    case 'NotAllowedError':
      return 'unsupported'
    default:
      break
  }

  // A fetch that never reached the server throws a TypeError in every browser.
  if (shape.name === 'TypeError' && 'message' in shape && /fetch|network/i.test(String((shape as { message?: string }).message))) {
    return 'network'
  }
  return 'unknown'
}
