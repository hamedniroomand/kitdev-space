const MAX_ARGON_MEMORY = 65536
const MAX_ARGON_TIME = 3
const MAX_BCRYPT_COST = 12

export type PasswordAlgorithm = 'argon2id' | 'bcrypt'

export async function benchmarkPassword(options: {
  password: string
  algorithm: PasswordAlgorithm
  memoryCost?: number
  timeCost?: number
  cost?: number
  verify?: boolean
}): Promise<{
  hash: string
  durationMs: number
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

  const started = performance.now()
  let hash: string

  if (options.algorithm === 'bcrypt') {
    const cost = options.cost ?? 10
    if (!Number.isInteger(cost) || cost < 4 || cost > MAX_BCRYPT_COST) {
      throw new Error(`Bcrypt cost must be an integer from 4 to ${MAX_BCRYPT_COST}.`)
    }
    hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost })
  }
  else {
    const memoryCost = options.memoryCost ?? 4096
    const timeCost = options.timeCost ?? 2
    if (!Number.isInteger(memoryCost) || memoryCost < 1024 || memoryCost > MAX_ARGON_MEMORY) {
      throw new Error(`Argon2 memoryCost must be an integer from 1024 to ${MAX_ARGON_MEMORY}.`)
    }
    if (!Number.isInteger(timeCost) || timeCost < 1 || timeCost > MAX_ARGON_TIME) {
      throw new Error(`Argon2 timeCost must be an integer from 1 to ${MAX_ARGON_TIME}.`)
    }
    hash = await Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost,
      timeCost,
    })
  }

  const durationMs = Math.round(performance.now() - started)
  const verified = options.verify
    ? await Bun.password.verify(password, hash)
    : undefined

  return {
    hash,
    durationMs,
    verified,
    algorithm: options.algorithm,
  }
}
