import semver from 'semver'

export type SemverAction = 'satisfies' | 'sort' | 'bump' | 'matrix'
export type SemverRelease = 'major' | 'minor' | 'patch' | 'prerelease'

export interface SemverMatchOptions {
  includePrerelease?: boolean
}

export interface SemverMatch {
  version: string
  valid: boolean
  matches: boolean
}

export interface SemverMatrixRow {
  version: string
  valid: boolean
  cells: boolean[]
}

export interface SemverMatrix {
  ranges: string[]
  rows: SemverMatrixRow[]
}

export function canSemverInBrowser(_action?: SemverAction): boolean {
  return true
}

function cleanRange(range: string): string {
  const value = range.trim()
  if (!value || !semver.validRange(value)) {
    throw new Error('Enter a valid semver range like ^1.2.3.')
  }
  return value
}

function cleanList(values: string[], message: string): string[] {
  const list = values.map(value => value.trim()).filter(Boolean)
  if (list.length === 0) {
    throw new Error(message)
  }
  return list
}

/**
 * Show a range as comparison operators.
 *
 * The `-0` suffix that semver adds to an upper bound is hidden. It excludes the
 * prereleases of that bound, and it is not a version that a package can have.
 */
export function explainSemverRange(range: string): string {
  const parsed = new semver.Range(cleanRange(range))
  return parsed.set
    .map(group => group.map(part => part.value.replace(/-0$/, '')).filter(Boolean).join(' ') || 'any version')
    .join(' || ')
}

export function semverSatisfies(version: string, range: string, options: SemverMatchOptions = {}): boolean {
  const value = version.trim()
  if (!value || !range.trim()) {
    throw new Error('Enter a version and a range.')
  }
  return semver.satisfies(value, cleanRange(range), { includePrerelease: options.includePrerelease === true })
}

/** Test one range against a list of candidate versions. */
export function semverMatchList(versions: string[], range: string, options: SemverMatchOptions = {}): SemverMatch[] {
  const cleaned = cleanRange(range)
  const includePrerelease = options.includePrerelease === true
  return cleanList(versions, 'Enter at least one version.').map(version => ({
    version,
    valid: semver.valid(version) !== null,
    matches: semver.satisfies(version, cleaned, { includePrerelease }),
  }))
}

/** Test a list of versions against a list of ranges. */
export function semverMatrix(versions: string[], ranges: string[], options: SemverMatchOptions = {}): SemverMatrix {
  const rangeList = cleanList(ranges, 'Enter at least one range.').map(cleanRange)
  const versionList = cleanList(versions, 'Enter at least one version.')
  const includePrerelease = options.includePrerelease === true
  return {
    ranges: rangeList,
    rows: versionList.map(version => ({
      version,
      valid: semver.valid(version) !== null,
      cells: rangeList.map(range => semver.satisfies(version, range, { includePrerelease })),
    })),
  }
}

export function semverSort(versions: string[]): string[] {
  const list = cleanList(versions, 'Enter at least one version.')
  if (list.some(value => semver.valid(value) === null)) {
    throw new Error('Enter a valid semver version like 1.2.3.')
  }
  return [...list].sort((a, b) => semver.compare(a, b))
}

export function semverBump(version: string, release: SemverRelease, identifier?: string): string {
  const cleaned = version.trim().replace(/^v/i, '')
  const tag = identifier?.trim()
  const bumped = tag ? semver.inc(cleaned, release, tag) : semver.inc(cleaned, release)
  if (!bumped) {
    throw new Error('Enter a valid semver version like 1.2.3.')
  }
  return bumped
}
