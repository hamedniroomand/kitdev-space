# Security Policy

## Supported versions

Only the live site at [kitdev.space](https://kitdev.space) and the `main` branch get security
fixes.

## Report a vulnerability

Do not open a public issue for a security problem.

1. Go to the **Security** tab of the repository.
2. Click **Report a vulnerability**.
3. Give these details:
   - The tool and the page URL.
   - The steps to cause the problem.
   - The effect of the problem, for example data that leaks or code that runs.
   - A fix, if you know one.

## What happens next

- The maintainer replies to the report in 7 days or less.
- The maintainer tells you if the report is accepted or declined.
- When the fix is live, the maintainer publishes an advisory. The advisory names you, if you agree.

## Scope

These problems are in scope:

- A tool uploads a private file or private input.
- A tool runs code from the input.
- A cross-site scripting (XSS) problem on a tool page.

These problems are not in scope:

- A problem in a dependency that has no effect on this project. Report it to the dependency.
- Reports from automatic scanners with no proof of an effect.
