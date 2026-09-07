import type { RegexTestResult } from '#shared/utils/dev/regex'
import { testRegex } from '#shared/utils/dev/regex'

export interface RegexWorkerRequest {
  id: number
  pattern: string
  sample: string
  flags: string
}

export interface RegexWorkerResponse {
  id: number
  result: RegexTestResult
}

globalThis.onmessage = (event: MessageEvent<RegexWorkerRequest>) => {
  const { id, pattern, sample, flags } = event.data
  try {
    const result = testRegex(pattern, sample, flags)
    globalThis.postMessage({ id, result } satisfies RegexWorkerResponse)
  }
  catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Regex execution failed'
    globalThis.postMessage({
      id,
      result: {
        pattern,
        flags,
        valid: false,
        error: errorMsg,
        matches: [],
        highlights: sample ? [{ text: sample, matched: false, matchIndex: null }] : [],
        explanations: [],
      },
    } satisfies RegexWorkerResponse)
  }
}
