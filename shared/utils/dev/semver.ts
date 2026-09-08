import semver from 'semver'

export type SemverAction = 'satisfies' | 'sort' | 'bump'
export type SemverRelease = 'major' | 'minor' | 'patch'

export function canSemverInBrowser(_action?: SemverAction): boolean {
  return true
}

export function semverSatisfies(version: string, range: string): boolean {
  const v = version.trim()
  const r = range.trim()
  if (!v || !r) {
    throw new Error('Enter a version and a range.')
  }
  return semver.satisfies(v, r)
}

export function semverSort(versions: string[]): string[] {
  const list = versions.map(v => v.trim()).filter(Boolean)
  if (list.length === 0) {
    throw new Error('Enter at least one version.')
  }
  return [...list].sort((a, b) => semver.compare(a, b))
}

export function semverBump(version: string, release: SemverRelease): string {
  const cleaned = version.trim().replace(/^v/i, '')
  const bumped = semver.inc(cleaned, release)
  if (!bumped) {
    throw new Error('Enter a valid semver version like 1.2.3.')
  }
  return bumped
}
