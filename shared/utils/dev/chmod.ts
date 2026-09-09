export interface PermissionTriplet {
  read: boolean
  write: boolean
  execute: boolean
}

export interface SpecialBits {
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export interface ChmodPermissions {
  special: SpecialBits
  owner: PermissionTriplet
  group: PermissionTriplet
  others: PermissionTriplet
}

/** A shell word that needs no quotes. `chmod` also reads a leading `-` as a flag. */
const SAFE_SHELL_WORD = /^[\w@%+=:,./-]+$/

export function tripletToOctal(triplet: PermissionTriplet): number {
  let value = 0
  if (triplet.read)
    value += 4
  if (triplet.write)
    value += 2
  if (triplet.execute)
    value += 1
  return value
}

export function octalToTriplet(digit: number): PermissionTriplet {
  return {
    read: (digit & 4) !== 0,
    write: (digit & 2) !== 0,
    execute: (digit & 1) !== 0,
  }
}

export function specialToOctal(special: SpecialBits): number {
  let value = 0
  if (special.setuid)
    value += 4
  if (special.setgid)
    value += 2
  if (special.sticky)
    value += 1
  return value
}

export function octalToSpecial(digit: number): SpecialBits {
  return {
    setuid: (digit & 4) !== 0,
    setgid: (digit & 2) !== 0,
    sticky: (digit & 1) !== 0,
  }
}

/** The special digit comes first and only when it is not zero, such as `2755`. */
export function permissionsToOctal(perms: ChmodPermissions): string {
  const special = specialToOctal(perms.special)
  const base = `${tripletToOctal(perms.owner)}${tripletToOctal(perms.group)}${tripletToOctal(perms.others)}`
  return special === 0 ? base : `${special}${base}`
}

export function octalToPermissions(octal: string): ChmodPermissions {
  const clean = octal.trim()
  if (!/^[0-7]{3,4}$/.test(clean)) {
    throw new Error('Enter 3 or 4 octal digits, from 000 to 7777.')
  }
  const digits = clean.length === 4 ? clean : `0${clean}`
  return {
    special: octalToSpecial(Number(digits[0])),
    owner: octalToTriplet(Number(digits[1])),
    group: octalToTriplet(Number(digits[2])),
    others: octalToTriplet(Number(digits[3])),
  }
}

/** A lowercase special character means execute is also on. An uppercase one means it is off. */
export function tripletToSymbolic(
  triplet: PermissionTriplet,
  special = false,
  specialChar: 's' | 't' = 's',
): string {
  let last = triplet.execute ? 'x' : '-'
  if (special) {
    last = triplet.execute ? specialChar : specialChar.toUpperCase()
  }
  return `${triplet.read ? 'r' : '-'}${triplet.write ? 'w' : '-'}${last}`
}

/** The 9 permission characters, without a file type character. */
export function permissionsToSymbolicBits(perms: ChmodPermissions): string {
  return tripletToSymbolic(perms.owner, perms.special.setuid, 's')
    + tripletToSymbolic(perms.group, perms.special.setgid, 's')
    + tripletToSymbolic(perms.others, perms.special.sticky, 't')
}

export function permissionsToSymbolic(perms: ChmodPermissions): string {
  return `-${permissionsToSymbolicBits(perms)}`
}

const SYMBOLIC_BITS = /^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/
const FILE_TYPE_CHAR = /^[-dlbcpsD]$/

function readTriplet(bits: string, specialChar: 's' | 't'): { triplet: PermissionTriplet, special: boolean } {
  const last = bits[2]!
  const upper = specialChar.toUpperCase()
  return {
    triplet: {
      read: bits[0] === 'r',
      write: bits[1] === 'w',
      execute: last === 'x' || last === specialChar,
    },
    special: last === specialChar || last === upper,
  }
}

/** Read a symbolic string from `ls -l`, with or without the file type character. */
export function symbolicToPermissions(symbolic: string): ChmodPermissions {
  const clean = symbolic.trim()
  if (clean.length !== 9 && clean.length !== 10) {
    throw new Error('Enter 9 or 10 characters, such as rwxr-xr-x or -rwxr-xr-x.')
  }
  if (clean.length === 10 && !FILE_TYPE_CHAR.test(clean[0]!)) {
    throw new Error('The first character must be a file type, such as - or d.')
  }
  const bits = clean.length === 10 ? clean.slice(1) : clean
  if (!SYMBOLIC_BITS.test(bits)) {
    throw new Error('Use r, w, and x, - for no permission, s or S in an owner or group slot, and t or T in the other slot.')
  }
  const owner = readTriplet(bits.slice(0, 3), 's')
  const group = readTriplet(bits.slice(3, 6), 's')
  const others = readTriplet(bits.slice(6, 9), 't')
  return {
    special: { setuid: owner.special, setgid: group.special, sticky: others.special },
    owner: owner.triplet,
    group: group.triplet,
    others: others.triplet,
  }
}

/**
 * Make a file name safe for a POSIX shell command.
 *
 * A single-quoted string protects every character. An embedded single quote
 * closes the string, adds a quoted quote, and opens the string again.
 * A name that starts with `-` gets a `./` prefix, because `chmod` reads the
 * name as a flag without it.
 */
export function quoteShellPath(path: string): string {
  const name = path.startsWith('-') ? `./${path}` : path
  if (name !== '' && SAFE_SHELL_WORD.test(name)) {
    return name
  }
  return `'${name.split('\'').join('\'"\'"\'')}'`
}
