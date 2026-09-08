import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { diffTexts, formatUnifiedDiff } from '#shared/utils/data/diff'

function applyPatchWithGit(original: string, modified: string, filename = 'sample.ts'): string {
  const diff = diffTexts(original, modified)
  const patch = formatUnifiedDiff(diff, `a/${filename}`, `b/${filename}`)

  const dir = mkdtempSync(join(tmpdir(), 'kitdev-git-patch-'))
  try {
    execSync('git init', { cwd: dir, stdio: 'pipe' })
    writeFileSync(join(dir, filename), original)
    execSync(`git add ${filename}`, { cwd: dir, stdio: 'pipe' })
    writeFileSync(join(dir, 'change.patch'), patch)
    execSync('git apply change.patch', { cwd: dir, stdio: 'pipe' })
    return readFileSync(join(dir, filename), 'utf8')
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('git apply with exported unified diff patch', () => {
  it('applies a patch modifying existing lines with trailing newlines', () => {
    const original = 'const a = 1\nconst b = 2\nconst c = 3\n'
    const modified = 'const a = 1\nconst b = 20\nconst c = 3\n'

    const result = applyPatchWithGit(original, modified)
    expect(result).toBe(modified)
  })

  it('applies a patch adding new lines at the beginning and end', () => {
    const original = 'const target = true\n'
    const modified = '// Header\nconst target = true\n// Footer\n'

    const result = applyPatchWithGit(original, modified)
    expect(result).toBe(modified)
  })

  it('applies a patch deleting lines from a multi-line file', () => {
    const original = 'line1\nline2\nline3\nline4\n'
    const modified = 'line1\nline4\n'

    const result = applyPatchWithGit(original, modified)
    expect(result).toBe(modified)
  })

  it('applies a patch when files do not have trailing newlines', () => {
    const original = 'alpha\nbeta\ngamma'
    const modified = 'alpha\nbeta modified\ngamma'

    const result = applyPatchWithGit(original, modified)
    expect(result).toBe(modified)
  })

  it('applies a patch across multiple hunks', () => {
    const original = `${Array.from({ length: 30 }, (_, i) => `row-${i}`).join('\n')}\n`
    const modified = `${Array.from({ length: 30 }, (_, i) => {
      if (i === 3) {
        return 'row-3-modified'
      }
      if (i === 25) {
        return 'row-25-modified'
      }
      return `row-${i}`
    }).join('\n')}\n`

    const result = applyPatchWithGit(original, modified)
    expect(result).toBe(modified)
  })
})
