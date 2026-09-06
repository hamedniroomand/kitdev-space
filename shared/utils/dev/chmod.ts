export interface PermissionTriplet {
  read: boolean
  write: boolean
  execute: boolean
}

export interface ChmodPermissions {
  owner: PermissionTriplet
  group: PermissionTriplet
  others: PermissionTriplet
}

export function tripletToOctal(triplet: PermissionTriplet): number {
  let value = 0
  if (triplet.read) value += 4
  if (triplet.write) value += 2
  if (triplet.execute) value += 1
  return value
}

export function octalToTriplet(digit: number): PermissionTriplet {
  return {
    read: (digit & 4) !== 0,
    write: (digit & 2) !== 0,
    execute: (digit & 1) !== 0
  }
}

export function permissionsToOctal(perms: ChmodPermissions): string {
  const o = tripletToOctal(perms.owner)
  const g = tripletToOctal(perms.group)
  const others = tripletToOctal(perms.others)
  return `${o}${g}${others}`
}

export function octalToPermissions(octal: string): ChmodPermissions {
  const clean = octal.trim()
  if (!/^[0-7]{3,4}$/.test(clean)) {
    throw new Error('Enter a valid 3 or 4-digit octal number from 000 to 777.')
  }
  const digits = clean.length === 4 ? clean.slice(1) : clean
  return {
    owner: octalToTriplet(Number(digits[0])),
    group: octalToTriplet(Number(digits[1])),
    others: octalToTriplet(Number(digits[2]))
  }
}

export function tripletToSymbolic(triplet: PermissionTriplet): string {
  return `${triplet.read ? 'r' : '-'}${triplet.write ? 'w' : '-'}${triplet.execute ? 'x' : '-'}`
}

export function permissionsToSymbolic(perms: ChmodPermissions): string {
  return `-${tripletToSymbolic(perms.owner)}${tripletToSymbolic(perms.group)}${tripletToSymbolic(perms.others)}`
}
