import { describe, expect, it } from 'vitest'
import {
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic
} from '../../../shared/utils/dev/chmod'

describe('chmod utilities', () => {
  it('converts octal 755 to permissions and symbolic string', () => {
    const perms = octalToPermissions('755')
    expect(perms.owner).toEqual({ read: true, write: true, execute: true })
    expect(perms.group).toEqual({ read: true, write: false, execute: true })
    expect(perms.others).toEqual({ read: true, write: false, execute: true })
    expect(permissionsToSymbolic(perms)).toBe('-rwxr-xr-x')
  })

  it('converts permissions back to octal', () => {
    const perms = octalToPermissions('644')
    expect(permissionsToOctal(perms)).toBe('644')
    expect(permissionsToSymbolic(perms)).toBe('-rw-r--r--')
  })

  it('rejects invalid octal strings', () => {
    expect(() => octalToPermissions('888')).toThrow()
    expect(() => octalToPermissions('abc')).toThrow()
  })
})
