# Contributing

Thank you for your help. This page tells you how to report a problem and how to send a change.

## Report a problem

Open an issue on GitHub. Give these details:

- The tool and the page URL.
- The input that caused the problem. Remove private data first.
- What you expected, and what the tool did.
- The browser and the operating system.

Do not open a public issue for a security problem. Use the "Report a vulnerability" form on the
Security tab of the repository instead.

## Send a change

1. Fork the repository and create a branch from `main`.
2. Install the dependencies with `bun install`. Bun 1.4 or later is required.
3. Make the change. Read `docs/tool-architecture.md` before you add or change a tool. Write prose
   that follows `docs/writing-rules.md`.
4. Run the checks:

   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```

5. Commit with a one-line Conventional Commit message, for example
   `fix(data): keep the key order in the yaml output`. The commit hook checks the message and
   runs the linter on the staged files.
6. Open a pull request. Say what the change does and why.

## Rules for a tool

- Run the work in the browser. Call the server only when the browser cannot do the work.
- A tool that reads a private file must not upload it.
- Each tool page states where its work runs.
- Add a unit test for the pure logic in `shared/utils/`.
