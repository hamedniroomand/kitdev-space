export function semverSatisfies(version: string, range: string): boolean {
  const v = version.trim()
  const r = range.trim()
  if (!v || !r) {
    throw new Error('Enter a version and a range.')
  }
  return Bun.semver.satisfies(v, r)
}

export function semverSort(versions: string[]): string[] {
  const list = versions.map(v => v.trim()).filter(Boolean)
  if (list.length === 0) {
    throw new Error('Enter at least one version.')
  }
  return [...list].sort((a, b) => Bun.semver.order(a, b))
}

export function semverBump(
  version: string,
  release: 'major' | 'minor' | 'patch'
): string {
  const cleaned = version.trim().replace(/^v/i, '')
  const parts = cleaned.split('.').map(Number)
  const majorPart = parts[0]
  const minorPart = parts[1]
  const patchPart = parts[2]
  if (
    majorPart == null
    || minorPart == null
    || patchPart == null
    || !Number.isInteger(majorPart)
    || !Number.isInteger(minorPart)
    || !Number.isInteger(patchPart)
    || majorPart < 0
    || minorPart < 0
    || patchPart < 0
  ) {
    throw new Error('Enter a valid semver version like 1.2.3.')
  }

  let major = majorPart
  let minor = minorPart
  let patch = patchPart
  if (release === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (release === 'minor') {
    minor += 1
    patch = 0
  } else {
    patch += 1
  }

  return `${major}.${minor}.${patch}`
}
