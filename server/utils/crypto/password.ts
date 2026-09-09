const MAX_ARGON_MEMORY = 65536
const MAX_ARGON_TIME = 3
const MAX_BCRYPT_COST = 12
const MAX_RUNS = 3

export type PasswordAlgorithm = 'argon2id' | 'bcrypt'

/** Keeps the repetition count an integer from 1 to MAX_RUNS. The request body is never trusted. */
export function clampRuns(runs: unknown): number {
  const value = Math.floor(Number(runs)) || 1
  return Math.min(MAX_RUNS, Math.max(1, value))
}

export function medianDuration(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle]!
  }
  return Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
}

function buildHashOptions(options: {
  algorithm: PasswordAlgorithm
  memoryCost?: number
  timeCost?: number
  cost?: number
}): Parameters<typeof Bun.password.hash>[1] {
  if (options.algorithm === 'bcrypt') {
    const cost = options.cost ?? 10
    if (!Number.isInteger(cost) || cost < 4 || cost > MAX_BCRYPT_COST) {
      throw new Error(`Bcrypt cost must be an integer from 4 to ${MAX_BCRYPT_COST}.`)
    }
    return { algorithm: 'bcrypt', cost }
  }

  const memoryCost = options.memoryCost ?? 4096
  const timeCost = options.timeCost ?? 2
  if (!Number.isInteger(memoryCost) || memoryCost < 1024 || memoryCost > MAX_ARGON_MEMORY) {
    throw new Error(`Argon2 memoryCost must be an integer from 1024 to ${MAX_ARGON_MEMORY}.`)
  }
  if (!Number.isInteger(timeCost) || timeCost < 1 || timeCost > MAX_ARGON_TIME) {
    throw new Error(`Argon2 timeCost must be an integer from 1 to ${MAX_ARGON_TIME}.`)
  }
  return { algorithm: 'argon2id', memoryCost, timeCost }
}

export async function benchmarkPassword(options: {
  password: string
  algorithm: PasswordAlgorithm
  memoryCost?: number
  timeCost?: number
  cost?: number
  verify?: boolean
  runs?: number
}): Promise<{
  hash: string
  /** The median of every run. It equals the single measurement of one run. */
  durationMs: number
  /** The measured time of each run, in the order of the runs. */
  durations: number[]
  runs: number
  verified?: boolean
  algorithm: PasswordAlgorithm
}> {
  const password = options.password
  if (!password) {
    throw new Error('Enter a password before you run the tool.')
  }
  if (password.length > 1024) {
    throw new Error('The password is too long.')
  }

  const hashOptions = buildHashOptions(options)
  const runs = clampRuns(options.runs)
  const durations: number[] = []
  let hash = ''

  for (let run = 0; run < runs; run += 1) {
    const started = performance.now()
    hash = await Bun.password.hash(password, hashOptions)
    durations.push(Math.round(performance.now() - started))
  }

  // One verify is enough. Each extra verify costs the same CPU as a hash.
  const verified = options.verify
    ? await Bun.password.verify(password, hash)
    : undefined

  return {
    hash,
    durationMs: medianDuration(durations),
    durations,
    runs,
    verified,
    algorithm: options.algorithm,
  }
}
