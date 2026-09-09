import type { MaybeRefOrGetter, Ref } from 'vue'
import { useUrlSearchParams } from '@vueuse/core'
import { computed, getCurrentInstance, onMounted, toValue, watch } from 'vue'
import { useCurrentToolId } from './useCurrentTool'
import { useToolInput } from './useToolInput'

/**
 * Tools with secret input.
 * The share action must not build links for these tools.
 */
export const SECRET_TOOL_IDS = new Set<string>([
  'aes',
  'hmac',
  'jwt',
  'totp',
  'hash',
  'cookie-inspector',
  'password-benchmark',
])

/**
 * Maximum byte size of input stored in URL hash.
 */
export const MAX_SHARE_INPUT_BYTES = 8192 // 8 KB

export function isSecretTool(toolId?: string | null): boolean {
  if (!toolId) {
    return false
  }
  return SECRET_TOOL_IDS.has(toolId)
}

export interface UseToolQueryOptions<T extends Record<string, any>> {
  toolId?: MaybeRefOrGetter<string | null | undefined>
  options?: T
  input?: Ref<string>
  autoRestore?: boolean
}

/**
 * Synchronize tool options with the URL query string.
 * Create share links with the input in the URL hash.
 */
export function useToolQuery<T extends Record<string, any>>(config: UseToolQueryOptions<T> = {}) {
  const currentToolIdState = useCurrentToolId()
  const resolvedToolId = computed(() => {
    const explicit = toValue(config.toolId)
    return explicit !== undefined ? explicit : currentToolIdState.value
  })

  const { reportInput } = useToolInput()

  // The router drops the URL fragment and the query string while it starts, so
  // both come from the plugin that read them before the app booted. A unit test
  // runs with no Nuxt app, so each lookup stays optional.
  function capturedByPlugin(key: '$shareHash' | '$shareSearch'): string {
    if (typeof useNuxtApp !== 'function') {
      return ''
    }
    try {
      const read = useNuxtApp()[key] as (() => string) | undefined
      return read?.() ?? ''
    }
    catch {
      return ''
    }
  }

  const initialHash = capturedByPlugin('$shareHash')
  const searchParams = useUrlSearchParams('history')

  // `searchParams` is empty during hydration, because the router has already
  // rewritten the URL. The captured string still holds the shared values.
  const capturedParams = new URLSearchParams(capturedByPlugin('$shareSearch'))

  function readParam(key: string): string | undefined {
    const captured = capturedParams.get(key)
    if (captured !== null) {
      return captured
    }
    const live = searchParams[key]
    if (live === undefined) {
      return undefined
    }
    return Array.isArray(live) ? live[0] : live
  }

  // Synchronize options with query string
  if (config.options) {
    const opts = config.options

    // Read initial options from query params
    for (const key of Object.keys(opts)) {
      const val = readParam(key)
      if (val !== undefined) {
        if (typeof opts[key] === 'boolean') {
          (opts as any)[key] = val === 'true'
        }
        else if (typeof opts[key] === 'number') {
          const num = Number(val)
          if (!Number.isNaN(num)) {
            (opts as any)[key] = num
          }
        }
        else {
          (opts as any)[key] = val
        }
      }
    }

    // Watch options and update query params
    watch(
      () => ({ ...opts }),
      (newOpts) => {
        for (const [key, val] of Object.entries(newOpts)) {
          if (val === undefined || val === null || val === '') {
            delete searchParams[key]
          }
          else {
            searchParams[key] = String(val)
          }
        }
      },
      { deep: true },
    )
  }

  const isSecret = computed(() => isSecretTool(resolvedToolId.value))

  const inputBytes = computed(() => {
    const text = config.input ? config.input.value : ''
    if (!text) {
      return 0
    }
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text).length
    }
    return text.length
  })

  const canShare = computed(() => {
    if (isSecret.value) {
      return false
    }
    return inputBytes.value <= MAX_SHARE_INPUT_BYTES
  })

  function restoreInputFromHash(targetRef?: Ref<string>): boolean {
    if (typeof window === 'undefined') {
      return false
    }
    const hash = window.location.hash || initialHash
    if (!hash || hash.length <= 1) {
      return false
    }

    let encoded = hash.slice(1)
    if (encoded.startsWith('input=')) {
      encoded = encoded.slice(6)
    }

    if (!encoded) {
      return false
    }

    try {
      const decoded = decodeURIComponent(encoded)
      const destination = targetRef ?? config.input
      if (destination) {
        destination.value = decoded
      }
      reportInput('url')
      return true
    }
    catch {
      return false
    }
  }

  function buildShareUrl(customInput?: string): string | null {
    if (typeof window === 'undefined') {
      return null
    }
    if (isSecret.value) {
      return null
    }

    const textToShare = customInput !== undefined ? customInput : (config.input ? config.input.value : '')
    const bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(textToShare).length
      : textToShare.length

    if (bytes > MAX_SHARE_INPUT_BYTES) {
      return null
    }

    const url = new URL(window.location.href)
    // Ensure input is not in query parameters
    url.searchParams.delete('input')

    // Add current options to query
    if (config.options) {
      for (const [key, val] of Object.entries(config.options)) {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, String(val))
        }
        else {
          url.searchParams.delete(key)
        }
      }
    }

    // Set input in hash fragment
    if (textToShare) {
      url.hash = `input=${encodeURIComponent(textToShare)}`
    }
    else {
      url.hash = ''
    }

    return url.toString()
  }

  if (config.autoRestore !== false) {
    if (getCurrentInstance()) {
      onMounted(() => {
        restoreInputFromHash()
      })
    }
    else {
      restoreInputFromHash()
    }
  }

  return {
    searchParams,
    isSecret,
    canShare,
    inputBytes,
    buildShareUrl,
    restoreInputFromHash,
  }
}
