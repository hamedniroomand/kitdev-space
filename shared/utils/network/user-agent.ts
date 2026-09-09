/**
 * Parse a User Agent string with `ua-parser-js`.
 *
 * The library is large, so it loads on demand with a dynamic import. It stays
 * out of the first bundle. A token that the library does not know gives
 * "Unknown". The parser never guesses a default browser.
 */

export const UNKNOWN = 'Unknown'

export type UserAgentDeviceType
  = | 'desktop'
    | 'mobile'
    | 'tablet'
    | 'bot'
    | 'console'
    | 'smarttv'
    | 'wearable'
    | 'xr'
    | 'embedded'
    | 'unknown'

export interface UserAgentInfo {
  browser: {
    name: string
    version: string
    major: string
    /** Library class of a non-browser client, such as `crawler`, `cli`, or `library`. */
    type: string
  }
  os: {
    name: string
    version: string
  }
  device: {
    type: UserAgentDeviceType
    vendor?: string
    model?: string
  }
  engine: {
    name: string
    version: string
  }
  /** True for a crawler, a command line client, or an HTTP library. */
  isBot: boolean
  /** True when the browser sends a reduced User Agent string with a frozen version. */
  isFrozen: boolean
}

export interface ClientHintBrand {
  brand: string
  version: string
}

/**
 * The low entropy values of `navigator.userAgentData`.
 *
 * The tool reads them only to show them. It does not store them and it does
 * not send them.
 */
export interface ClientHints {
  brands: ClientHintBrand[]
  mobile: boolean
  platform: string
}

export function unknownUserAgentInfo(): UserAgentInfo {
  return {
    browser: { name: UNKNOWN, version: '', major: '', type: '' },
    os: { name: UNKNOWN, version: '' },
    device: { type: 'unknown' },
    engine: { name: UNKNOWN, version: '' },
    isBot: false,
    isFrozen: false,
  }
}

type ParserBundle = Awaited<ReturnType<typeof importParser>>

let parserBundle: Promise<ParserBundle> | null = null

async function importParser() {
  const [core, extensions, botDetection, helpers] = await Promise.all([
    import('ua-parser-js'),
    import('ua-parser-js/extensions'),
    import('ua-parser-js/bot-detection'),
    import('ua-parser-js/helpers'),
  ])

  return {
    UAParser: core.UAParser,
    // The core parser knows browsers only. These sets add crawlers, command
    // line clients, and HTTP libraries.
    extensions: [
      extensions.Bots,
      extensions.CLIs,
      extensions.Crawlers,
      extensions.Fetchers,
      extensions.Libraries,
    ],
    isBot: botDetection.isBot,
    isFrozenUA: helpers.isFrozenUA,
  }
}

function loadParser(): Promise<ParserBundle> {
  parserBundle ??= importParser()
  return parserBundle
}

function named(value: string | undefined): string {
  return value && value.trim() ? value : UNKNOWN
}

function optional(value: string | undefined): string {
  return value ?? ''
}

function deviceType(raw: string | undefined, osName: string, isBot: boolean): UserAgentDeviceType {
  if (isBot) {
    return 'bot'
  }
  if (raw) {
    return raw as UserAgentDeviceType
  }
  // The library omits the type for a desktop. It gives no operating system for
  // a string that it does not know, so that stays unknown.
  return osName === UNKNOWN ? 'unknown' : 'desktop'
}

/**
 * Parse a User Agent string into browser, operating system, device, and engine.
 *
 * An empty input, an unknown token, or a parser error gives "Unknown".
 */
export async function parseUserAgent(uaString: string): Promise<UserAgentInfo> {
  const ua = uaString.trim()
  if (!ua) {
    return unknownUserAgentInfo()
  }

  try {
    const { UAParser, extensions, isBot, isFrozenUA } = await loadParser()
    const parser = new UAParser(ua)
    for (const extension of extensions) {
      parser.useExtension(extension)
    }
    const result = parser.getResult()
    const bot = isBot(ua)
    const osName = named(result.os.name)

    return {
      browser: {
        name: named(result.browser.name),
        version: optional(result.browser.version),
        major: optional(result.browser.major),
        type: optional(result.browser.type),
      },
      os: {
        name: osName,
        version: optional(result.os.version),
      },
      device: {
        type: deviceType(result.device.type, osName, bot),
        vendor: result.device.vendor,
        model: result.device.model,
      },
      engine: {
        name: named(result.engine.name),
        version: optional(result.engine.version),
      },
      isBot: bot,
      isFrozen: isFrozenUA(ua),
    }
  }
  catch {
    return unknownUserAgentInfo()
  }
}

/**
 * Read the low entropy Client Hints of a browser.
 *
 * `navigator.userAgentData` is not in every browser. The function gives `null`
 * when the value is absent or has a different shape.
 */
export function normalizeClientHints(raw: unknown): ClientHints | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const data = raw as { brands?: unknown, mobile?: unknown, platform?: unknown }
  const brands = Array.isArray(data.brands)
    ? data.brands
        .filter((item): item is ClientHintBrand => Boolean(item) && typeof item === 'object' && typeof (item as ClientHintBrand).brand === 'string')
        .map(item => ({ brand: item.brand, version: String(item.version ?? '') }))
    : []

  if (!brands.length && typeof data.platform !== 'string') {
    return null
  }

  return {
    brands,
    mobile: data.mobile === true,
    platform: typeof data.platform === 'string' && data.platform ? data.platform : UNKNOWN,
  }
}
