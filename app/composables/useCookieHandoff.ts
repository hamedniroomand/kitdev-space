export const COOKIE_HANDOFF_KEY = 'kitdev:cookie:handoff-headers'

export interface CookieHandoff {
  /** One Set-Cookie header on each line. */
  headers: string
  /** The URL of the response that carried the headers. */
  url?: string
}

/**
 * Sends Set-Cookie headers from one tool to another tool in memory.
 *
 * The headers stay in Nuxt state. They never enter the URL, local storage, or
 * an analytics event, because a cookie value is a secret. The receiving tool
 * reads the headers one time.
 */
export function useCookieHandoff() {
  const handoffState = useState<CookieHandoff | null>(COOKIE_HANDOFF_KEY, () => null)

  function setHandoffCookies(handoff: CookieHandoff) {
    handoffState.value = handoff
  }

  function consumeHandoffCookies(): CookieHandoff | null {
    const handoff = handoffState.value
    if (handoff) {
      handoffState.value = null
      return handoff
    }
    return null
  }

  return {
    handoffState,
    setHandoffCookies,
    consumeHandoffCookies,
  }
}
