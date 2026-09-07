export function globToRegex(glob: string): RegExp {
  let pattern = glob.trim()
  const isNegative = pattern.startsWith('!')
  if (isNegative) {
    pattern = pattern.slice(1)
  }

  // Handle brace expansion {a,b,c}
  pattern = pattern.replace(/\{([^{}]+)\}/g, (_match, group: string) => {
    if (group.includes(',')) {
      const parts = group.split(',').map(part => part.trim())
      return `§§BRACE_START§§${parts.join('§§BRACE_PIPE§§')}§§BRACE_END§§`
    }
    return _match
  })

  // Preserve character classes [abc] and [!abc]
  const charClasses: string[] = []
  pattern = pattern.replace(/\[(!|\^)?([^\]\n\r]+)\]/g, (_match, neg, chars) => {
    const isNeg = neg === '!' || neg === '^'
    const regexClass = isNeg ? `[^/${chars}]` : `[${chars}]`
    const placeholder = `§§CCLASS_${charClasses.length}§§`
    charClasses.push(regexClass)
    return placeholder
  })

  // Replace placeholders before regex escaping
  pattern = pattern.replace(/\/\*\*\//g, '/§§GLOBSTAR_SLASH§§/')
  pattern = pattern.replace(/\*\*/g, '§§GLOBSTAR§§')
  pattern = pattern.replace(/\*/g, '§§STAR§§')
  pattern = pattern.replace(/\?/g, '§§QMARK§§')

  // Escape special regex characters
  pattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')

  // Restore character classes
  pattern = pattern.replace(/§§CCLASS_(\d+)§§/g, (_m, idx) => charClasses[Number(idx)] ?? '')

  // Replace back placeholders
  pattern = pattern.replace(/\/§§GLOBSTAR_SLASH§§\//g, '(?:\\/|\\/.*\\/)')
  pattern = pattern.replace(/^§§GLOBSTAR§§\//g, '(?:.*\\/)?')
  pattern = pattern.replace(/§§GLOBSTAR§§/g, '.*')
  pattern = pattern.replace(/§§STAR§§/g, '[^/]*')
  pattern = pattern.replace(/§§QMARK§§/g, '[^/]')
  pattern = pattern.replace(/§§BRACE_START§§/g, '(?:')
  pattern = pattern.replace(/§§BRACE_PIPE§§/g, '|')
  pattern = pattern.replace(/§§BRACE_END§§/g, ')')

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
