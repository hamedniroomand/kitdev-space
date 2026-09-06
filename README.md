# KitDev Space

Developer tools that run in the browser. Convert, inspect, and clean data without an upload.

Live site: [kitdev.space](https://kitdev.space)

## What it is

A hub of small tools for people who build software: JSON, YAML, TOML, and XML converters, a
SQLite studio, an EXIF viewer and remover, an image cropper, hash and ID generators, DNS and TLS
inspectors, and more. Every tool has one page, one job, and prose that explains it.

The rule for every tool: run the work in the browser. A tool calls the server only when the
browser cannot do the work, such as a DNS lookup, a TLS handshake, or an AVIF encode. A tool that
reads a private file never uploads it. Each page states where its work runs.

## Stack

- [Nuxt 4](https://nuxt.com) with [Nuxt UI](https://ui.nuxt.com) and Tailwind CSS
- [Bun](https://bun.sh) for the runtime, the package manager, the test runner, and the server tools
- CodeMirror for the editors, sql.js for SQLite in the browser
- Every page is prerendered. The server routes run on Vercel.

## Setup

Bun 1.4 or later is required.

```bash
bun install
cp .env.example .env
```

The `.env` file is optional. It holds the Google Analytics id and the OG image secret. Both are
empty by default.

## Development

```bash
bun run dev
```

## Tests

```bash
bun run test            # unit tests with Vitest, server tests with bun test
bunx playwright install chromium
bun run test:e2e        # browser tests with Playwright
bun run lint
bun run typecheck
```

## Production

```bash
bun run build
bun run preview
```

## Project layout

| Path | Holds |
| --- | --- |
| `app/pages/hub/` | One page per tool, grouped by lab |
| `app/components/` | Shared components, such as the tool frame and the editors |
| `shared/utils/` | Pure logic that the browser and the server share, with the tool registry in `tools.ts` |
| `server/api/` | The routes for work that needs the server |
| `docs/` | The rules for tools, writing, accessibility, and security |

## Contributing

Read `docs/tool-architecture.md` before you add or change a tool. It says where the work runs,
how the registry drives the page copy, and how analytics is wired. Write prose that follows
`docs/writing-rules.md`.

Commits follow Conventional Commits, one line, checked by commitlint. The pre-commit hook runs the
linter on the staged files.

## License

[MIT](LICENSE)
