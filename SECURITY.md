# Security Policy

## Supported versions

Only the latest release on `main` is supported.

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities. Report them
privately via [GitHub security advisories](../../security/advisories/new).

You can expect an initial response within a week. Please include reproduction
steps and the impact you believe the issue has.

## Scope notes

- validate is a prompt-only plugin: it ships no executable code beyond three
  maintenance/eval scripts (`scripts/check.mjs`, `scripts/release.mjs`,
  `evals/setup-fixtures.mjs`) that never run at the install site. The attack
  surface is the instructions themselves.
- The instructions direct an agent to run project build/test/launch commands in
  the user's working directory. Anything that could trick the agent into
  running commands outside that intent (prompt injection via crafted repo
  content the skill tells the agent to read) is in scope.
