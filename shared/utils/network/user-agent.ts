export interface UserAgentInfo {
  browser: {
    name: string
    version: string
    major: string
  }
  os: {
    name: string
    version: string
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
    vendor?: string
    model?: string
  }
  engine: {
    name: string
    version: string
  }
  isBot: boolean
}

export function parseUserAgent(uaString: string): UserAgentInfo {
  const ua = uaString.trim()
  if (!ua) {
    return {
      browser: { name: 'Unknown', version: '', major: '' },
      os: { name: 'Unknown', version: '' },
      device: { type: 'unknown' },
      engine: { name: 'Unknown', version: '' },
      isBot: false,
    }
  }

  // 1. Detect Bots
  const botMatch = ua.match(/(Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|facebookexternalhit|Twitterbot|Applebot|curl|Wget|PostmanRuntime)/i)
  if (botMatch) {
    return {
      browser: { name: botMatch[1] || 'Bot', version: '', major: '' },
      os: { name: 'Unknown', version: '' },
      device: { type: 'bot' },
      engine: { name: 'Bot', version: '' },
      isBot: true,
    }
  }

  // 2. Detect OS
  let osName = 'Unknown'
  let osVersion = ''

  if (/Windows NT 10\.0/i.test(ua)) {
    osName = 'Windows'
    osVersion = '10 / 11'
  }
  else if (/Windows NT 6\.3/i.test(ua)) {
    osName = 'Windows'
    osVersion = '8.1'
  }
  else if (/Windows NT 6\.1/i.test(ua)) {
    osName = 'Windows'
    osVersion = '7'
  }
  else if (/Android/i.test(ua)) {
    osName = 'Android'
    const match = ua.match(/Android\s+([\d.]+)/i)
    if (match?.[1])
      osVersion = match[1]
  }
  else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = 'iOS'
    const match = ua.match(/OS\s+([\d_]+)/i)
    if (match?.[1])
      osVersion = match[1].replace(/_/g, '.')
  }
  else if (/Mac OS X/i.test(ua)) {
    osName = 'macOS'
    const match = ua.match(/Mac OS X\s+([\d_]+)/i)
    if (match?.[1])
      osVersion = match[1].replace(/_/g, '.')
  }
  else if (/CrOS/i.test(ua)) {
    osName = 'ChromeOS'
  }
  else if (/Linux/i.test(ua)) {
    osName = 'Linux'
  }

  // 3. Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop'
  let vendor: string | undefined
  let model: string | undefined

  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    deviceType = 'tablet'
    if (/iPad/i.test(ua)) {
      vendor = 'Apple'
      model = 'iPad'
    }
  }
  else if (/iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'mobile'
    if (/iPhone/i.test(ua)) {
      vendor = 'Apple'
      model = 'iPhone'
    }
  }
  else if (osName === 'macOS' || osName === 'Windows' || osName === 'Linux' || osName === 'ChromeOS') {
    deviceType = 'desktop'
  }

  // 4. Detect Engine
  let engineName = 'Unknown'
  let engineVersion = ''

  if (/Blink/i.test(ua) || (/Chrome/i.test(ua) && !/Edge|Edg\//i.test(ua))) {
    engineName = 'Blink'
  }
  else if (/WebKit/i.test(ua)) {
    engineName = 'WebKit'
    const match = ua.match(/AppleWebKit\/([\d.]+)/i)
    if (match?.[1])
      engineVersion = match[1]
  }
  else if (/Gecko/i.test(ua) && /Firefox/i.test(ua)) {
    engineName = 'Gecko'
    const match = ua.match(/rv:([\d.]+)/i)
    if (match?.[1])
      engineVersion = match[1]
  }
  else if (/Trident/i.test(ua)) {
    engineName = 'Trident'
  }

  // 5. Detect Browser
  let browserName = 'Unknown'
  let browserVersion = ''

  if (/Edg\//i.test(ua)) {
    browserName = 'Microsoft Edge'
    const match = ua.match(/Edg\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }
  else if (/OPR\/|Opera\//i.test(ua)) {
    browserName = 'Opera'
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }
  else if (/SamsungBrowser\//i.test(ua)) {
    browserName = 'Samsung Internet'
    const match = ua.match(/SamsungBrowser\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }
  else if (/Chrome\//i.test(ua)) {
    browserName = 'Chrome'
    const match = ua.match(/Chrome\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }
  else if (/Firefox\//i.test(ua)) {
    browserName = 'Firefox'
    const match = ua.match(/Firefox\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browserName = 'Safari'
    const match = ua.match(/Version\/([\d.]+)/i)
    if (match?.[1])
      browserVersion = match[1]
  }

  const major = browserVersion ? browserVersion.split('.')[0] || '' : ''

  return {
    browser: {
      name: browserName,
      version: browserVersion,
      major,
    },
    os: {
      name: osName,
      version: osVersion,
    },
    device: {
      type: deviceType,
      vendor,
      model,
    },
    engine: {
      name: engineName,
      version: engineVersion,
    },
    isBot: false,
  }
}
