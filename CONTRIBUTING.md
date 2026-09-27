# Contributing

Thank you for your help. This page tells you how to report a problem and how to send a change.

## Report a problem

Open an issue on GitHub. Give these details:

- The tool and the page URL.
- The input that caused the problem. Remove private data first.
- What you expected, and what the tool did.
- The browser and the operating system.

Do not open a public issue for a security problem. Use the "Report a vulnerability" form on the
Security tab of the repository instead. Read [SECURITY.md](SECURITY.md) for the details.

## Send a change

1. Fork the repository and create a branch from `main`.
2. Install the dependencies with `bun install`. Bun 1.4 or later is required.
3. Make the change. Read [docs/architecture.md](docs/architecture.md) before you add or change a
   tool. Read [docs/security-controls.md](docs/security-controls.md) before you change a server
   route or a network tool. Write prose that follows the [writing style](#writing-style).
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
- The user can reach every main action with the keyboard, and focus is visible.
- Every form field has a label. Show an error with `ToolError`, so assistive technology reads it.

## Writing style

Write all technical English in [ASD-STE100](https://www.asd-ste100.org) Simplified Technical
English. This covers docs, page prose, UI text, and code comments. Code syntax, identifiers, API
names, and library names do not need to follow it.

- Use short sentences, one instruction in each sentence.
- Use the active voice and common words. Do not use idioms or marketing language.
- Add a code comment only to explain an edge case or behavior that is not obvious.
- Use the same term for the same concept:

| Term | Meaning |
| --- | --- |
| user | A person who uses the product |
| tool | A KitDev Space utility |
| input | Data that the user gives |
| output | Data that the tool creates |
| result | The final tool output |
| error | A failed operation |
| convert | A format change |
| validate | An input check |
| format | A layout change |
| copy | A clipboard action |
| download | File output |
