import { semverBump, semverSatisfies, semverSort } from '#server/utils/dev/semver'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

type SemverAction = 'satisfies' | 'sort' | 'bump'
type SemverRelease = 'major' | 'minor' | 'patch'

interface SemverBody {
  action?: SemverAction
  version?: string
  range?: string
  versions?: string[] | string
  release?: SemverRelease
}

const actions = new Set<SemverAction>(['satisfies', 'sort', 'bump'])
const releases = new Set<SemverRelease>(['major', 'minor', 'patch'])

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:semver')

  const body = await readBody<SemverBody>(event)
  const action = body.action

  if (!action || !actions.has(action)) {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid action: satisfies, sort, or bump.'
    })
  }

  try {
    if (action === 'satisfies') {
      return {
        result: {
          ok: semverSatisfies(body.version ?? '', body.range ?? '')
        }
      }
    }

    if (action === 'sort') {
      const versions = Array.isArray(body.versions)
        ? body.versions
        : String(body.versions ?? '')
            .split(/[\n,]+/)
            .map(v => v.trim())
            .filter(Boolean)

      if (versions.join('\n').length > 500_000) {
        throw new Error('Input is too large.')
      }

      return { result: { versions: semverSort(versions) } }
    }

    const release = body.release ?? 'patch'
    if (!releases.has(release)) {
      throw new Error('Choose major, minor, or patch.')
    }

    return {
      result: {
        version: semverBump(body.version ?? '', release)
      }
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The semver operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
