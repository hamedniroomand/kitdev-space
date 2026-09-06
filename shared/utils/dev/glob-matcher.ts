export function globToRegex(glob: string): RegExp {
  let pattern = glob.trim()
  const isNegative = pattern.startsWith('!')
  if (isNegative) {
    pattern = pattern.slice(1)
  }

  // Replace placeholders before regex escaping
  pattern = pattern.replace(/\/\*\*\//g, '/§§GLOBSTAR_SLASH§§/')
  pattern = pattern.replace(/\*\*/g, '§§GLOBSTAR§§')
  pattern = pattern.replace(/\*/g, '§§STAR§§')
  pattern = pattern.replace(/\?/g, '§§QMARK§§')

  // Escape special regex characters
  pattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')

  // Replace back placeholders
  pattern = pattern.replace(/\/§§GLOBSTAR_SLASH§§\//g, '(?:\\/|\\/.*\\/)')
  pattern = pattern.replace(/§§GLOBSTAR§§/g, '.*')
  pattern = pattern.replace(/§§STAR§§/g, '[^/]*')
  pattern = pattern.replace(/§§QMARK§§/g, '[^/]')

  const regexStr = pattern.startsWith('/')
    ? `^${pattern.slice(1)}$`
    : `(^|/)${pattern}$`

  return new RegExp(regexStr)
}

export function testGlobMatch(pattern: string, path: string): boolean {
  const cleanPattern = pattern.trim()
  const cleanPath = path.trim()
  if (!cleanPattern || !cleanPath)
    return false

  const isNegative = cleanPattern.startsWith('!')
  try {
    const regex = globToRegex(cleanPattern)
    const matches = regex.test(cleanPath)
    return isNegative ? !matches : matches
  }
  catch {
    return false
  }
}
