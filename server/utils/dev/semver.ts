export { semverBump } from '#shared/utils/dev/semver'

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
