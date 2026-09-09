import { describe, expect, it } from 'vitest'
import {
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  quoteShellPath,
  symbolicToPermissions,
} from '#shared/utils/dev/chmod'

describe('chmod utilities', () => {
  it('converts octal 755 to permissions and symbolic string', () => {
    const perms = octalToPermissions('755')
    expect(perms.owner).toEqual({ read: true, write: true, execute: true })
    expect(perms.group).toEqual({ read: true, write: false, execute: true })
    expect(perms.others).toEqual({ read: true, write: false, execute: true })
    expect(perms.special).toEqual({ setuid: false, setgid: false, sticky: false })
    expect(permissionsToSymbolic(perms)).toBe('-rwxr-xr-x')
  })

  it('converts permissions back to octal', () => {
    const perms = octalToPermissions('644')
    expect(permissionsToOctal(perms)).toBe('644')
    expect(permissionsToSymbolic(perms)).toBe('-rw-r--r--')
  })

  it('rejects an invalid octal string', () => {
    expect(() => octalToPermissions('888')).toThrow(/3 or 4 octal digits/)
    expect(() => octalToPermissions('abc')).toThrow(/3 or 4 octal digits/)
    expect(() => octalToPermissions('75')).toThrow(/3 or 4 octal digits/)
    expect(() => octalToPermissions('12345')).toThrow(/3 or 4 octal digits/)
  })
})

describe('special permission bits', () => {
  it('reads a 4-digit octal', () => {
    expect(octalToPermissions('4755').special).toEqual({ setuid: true, setgid: false, sticky: false })
    expect(octalToPermissions('2755').special).toEqual({ setuid: false, setgid: true, sticky: false })
    expect(octalToPermissions('1777').special).toEqual({ setuid: false, setgid: false, sticky: true })
    expect(octalToPermissions('7000').special).toEqual({ setuid: true, setgid: true, sticky: true })
  })

  it('omits the special digit when it is zero', () => {
    expect(permissionsToOctal(octalToPermissions('0755'))).toBe('755')
    expect(octalToPermissions('0755')).toEqual(octalToPermissions('755'))
    expect(permissionsToOctal(octalToPermissions('4755'))).toBe('4755')
    expect(permissionsToOctal(octalToPermissions('1777'))).toBe('1777')
  })

  it('writes a lowercase special character when execute is on', () => {
    expect(permissionsToSymbolic(octalToPermissions('4755'))).toBe('-rwsr-xr-x')
    expect(permissionsToSymbolic(octalToPermissions('2755'))).toBe('-rwxr-sr-x')
    expect(permissionsToSymbolic(octalToPermissions('1777'))).toBe('-rwxrwxrwt')
  })

  it('writes an uppercase special character when execute is off', () => {
    expect(permissionsToSymbolic(octalToPermissions('4644'))).toBe('-rwSr--r--')
    expect(permissionsToSymbolic(octalToPermissions('2644'))).toBe('-rw-r-Sr--')
    expect(permissionsToSymbolic(octalToPermissions('1666'))).toBe('-rw-rw-rwT')
  })
})

describe('symbolicToPermissions', () => {
  it('converts a 9-character string', () => {
    expect(permissionsToOctal(symbolicToPermissions('rwxr-xr-x'))).toBe('755')
    expect(permissionsToOctal(symbolicToPermissions('rw-r--r--'))).toBe('644')
    expect(permissionsToOctal(symbolicToPermissions('---------'))).toBe('000')
    expect(permissionsToOctal(symbolicToPermissions('rwxrwxrwx'))).toBe('777')
  })

  it('converts a 10-character string with a file type character', () => {
    expect(permissionsToOctal(symbolicToPermissions('-rwxr-xr-x'))).toBe('755')
    expect(permissionsToOctal(symbolicToPermissions('drwxr-xr-x'))).toBe('755')
    expect(permissionsToOctal(symbolicToPermissions('lrwxrwxrwx'))).toBe('777')
  })

  it('converts the special characters', () => {
    expect(permissionsToOctal(symbolicToPermissions('rwxr-sr-x'))).toBe('2755')
    expect(permissionsToOctal(symbolicToPermissions('rwsr-xr-x'))).toBe('4755')
    expect(permissionsToOctal(symbolicToPermissions('rwxrwxrwt'))).toBe('1777')
    expect(permissionsToOctal(symbolicToPermissions('rwSr--r--'))).toBe('4644')
    expect(permissionsToOctal(symbolicToPermissions('rw-r-Sr--'))).toBe('2644')
    expect(permissionsToOctal(symbolicToPermissions('rw-rw-rwT'))).toBe('1666')
  })

  it('round-trips every special bit in both cases', () => {
    expect(permissionsToOctal(symbolicToPermissions('rwSrwSrwT'))).toBe('7666')
    expect(permissionsToSymbolic(octalToPermissions('7666'))).toBe('-rwSrwSrwT')
    expect(permissionsToOctal(symbolicToPermissions('rwsrwsrwt'))).toBe('7777')
    expect(permissionsToSymbolic(octalToPermissions('7777'))).toBe('-rwsrwsrwt')
  })

  it('trims surrounding space', () => {
    expect(permissionsToOctal(symbolicToPermissions('  rwxr-xr-x  '))).toBe('755')
  })

  it('rejects a wrong length', () => {
    expect(() => symbolicToPermissions('rwxr-xr-')).toThrow(/9 or 10 characters/)
    expect(() => symbolicToPermissions('drwxr-xr-xx')).toThrow(/9 or 10 characters/)
    expect(() => symbolicToPermissions('')).toThrow(/9 or 10 characters/)
  })

  it('rejects an illegal character', () => {
    expect(() => symbolicToPermissions('rwtr-xr-x')).toThrow(/Use r, w, and x/)
    expect(() => symbolicToPermissions('rwxr-xr-s')).toThrow(/Use r, w, and x/)
    expect(() => symbolicToPermissions('rwxr-tr-x')).toThrow(/Use r, w, and x/)
    expect(() => symbolicToPermissions('xwrxwrxwr')).toThrow(/Use r, w, and x/)
    expect(() => symbolicToPermissions('rwxr-xr-?')).toThrow(/Use r, w, and x/)
  })

  it('rejects an unknown file type character', () => {
    expect(() => symbolicToPermissions('zrwxr-xr-x')).toThrow(/file type/)
  })
})

describe('quoteShellPath', () => {
  it('leaves a safe name unquoted', () => {
    expect(quoteShellPath('file.txt')).toBe('file.txt')
    expect(quoteShellPath('/usr/local/bin/my_app-1.0')).toBe('/usr/local/bin/my_app-1.0')
  })

  it('quotes a space', () => {
    expect(quoteShellPath('my file.txt')).toBe('\'my file.txt\'')
  })

  it('quotes an apostrophe the POSIX way', () => {
    expect(quoteShellPath('it\'s.txt')).toBe('\'it\'"\'"\'s.txt\'')
  })

  it('quotes a shell variable', () => {
    expect(quoteShellPath('$VAR')).toBe('\'$VAR\'')
    expect(quoteShellPath('a$\'b')).toBe('\'a$\'"\'"\'b\'')
  })

  it('quotes a shell metacharacter', () => {
    expect(quoteShellPath('`whoami`')).toBe('\'`whoami`\'')
    expect(quoteShellPath('a;rm -rf /')).toBe('\'a;rm -rf /\'')
    expect(quoteShellPath('a&&b')).toBe('\'a&&b\'')
    expect(quoteShellPath('a|b')).toBe('\'a|b\'')
    expect(quoteShellPath('*.txt')).toBe('\'*.txt\'')
    expect(quoteShellPath('a(b)c')).toBe('\'a(b)c\'')
    expect(quoteShellPath('#file')).toBe('\'#file\'')
    expect(quoteShellPath('a\nb')).toBe('\'a\nb\'')
  })

  it('quotes an empty name', () => {
    expect(quoteShellPath('')).toBe('\'\'')
  })

  it('adds a path prefix to a name that starts with a dash', () => {
    expect(quoteShellPath('-rf')).toBe('./-rf')
    expect(quoteShellPath('-')).toBe('./-')
    expect(quoteShellPath('-my file')).toBe('\'./-my file\'')
  })
})
