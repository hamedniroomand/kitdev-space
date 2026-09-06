/**
 * Semver in the browser.
 *
 * A bump is arithmetic on three numbers, so it needs no library. `satisfies`
 * and `sort` use `Bun.semver`, which reads the full range grammar, so
 * `/api/dev/semver` keeps those two.
 */

export type SemverAction = 'satisfies' | 'sort' | 'bump'
export type SemverRelease = 'major' | 'minor' | 'patch'

export function canSemverInBrowser(action: SemverAction): boolean {
  return action === 'bump'
}

export function semverBump(version: string, release: SemverRelease): string {
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
