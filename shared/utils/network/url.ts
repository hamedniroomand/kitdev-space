export interface UrlParts {
  href: string
  protocol: string
  username: string
  password: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  searchParams: Record<string, string>
  hash: string
}

export function inspectUrl(input: string): UrlParts {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Enter a URL.')
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Enter a valid URL.')
  }

  const searchParams: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value
  })

  return {
    href: url.href,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    searchParams,
    hash: url.hash
  }
}
