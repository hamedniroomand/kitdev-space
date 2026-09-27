# AGENTS.md

Rules for coding agents in this repository. Human contributors can read them too.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the checks, the commit format, and the writing style.
Read [docs/architecture.md](docs/architecture.md) before you add or change a tool. It states where
the work runs, how the registry drives the page copy, and how analytics is wired. Read
[docs/security-controls.md](docs/security-controls.md) before you change a server route or a
network tool.

## How to write code

Be lazy. Lazy means efficient, not careless. The best code is the code never written.

First understand the problem: read the task and the code it touches, and trace the real flow end to
end. Then stop at the first rung that holds:

1. Does this need to be built at all?
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that is already here.
3. Does the standard library or a platform API do this? Use it.
4. Does an installed dependency solve it? Use it.
5. Only then: write the minimum code that works.

Fix a bug at the root cause. A report names a symptom. Grep every caller of the function you touch
and fix the shared function once, so a sibling caller does not stay broken.

- Do not add an abstraction, a dependency, or boilerplate that the task does not need.
- Deletion over addition. Boring over clever. Do not add a file that the task does not need.
- The shortest working diff wins, but only in the right place. The smallest change in the wrong
  place is a second bug.
- When a request adds a dependency or an abstraction, ask if a smaller solution covers it.
- When two approaches are the same size, pick the one that is correct on edge cases.
- Give each new component, utility, and composable one concern. Apply this rule only to code that
  the task creates or changes.
- Mark a deliberate shortcut with a known ceiling (a global lock, an O(n²) scan, a naive heuristic)
  with a `ponytail:` comment. Name the ceiling and the upgrade path.

## VueUse first

Use a VueUse composable or utility when one meets the requirement. Write custom code only when no
VueUse function meets it. Then write the smallest solution that works.

## Icons

Do not use the `i-lucide-sparkles` icon. Use a specific semantic icon, such as `i-lucide-database`,
`i-lucide-file-text`, `i-lucide-refresh-cw`, or `i-lucide-folder-open`.

## Commits

Do not commit until the maintainer asks for it. Use the one-line Conventional Commit format from
CONTRIBUTING.md. Do not add AI attribution or trailers to a commit message.
