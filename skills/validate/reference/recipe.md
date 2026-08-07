# Recipe — persisting what worked

The first validation run in a project spends most of its time discovering
commands: how to build, how to run tests, how to launch the app. That
discovery is worth money — persist it so the next run (by you, another
session, or another agent entirely) starts warm.

## Location

Write to **`.claude/skills/validate-recipe/SKILL.md`** by default. If a
recipe already exists at `.github/skills/validate-recipe/SKILL.md` or
`.agents/skills/validate-recipe/SKILL.md`, update it **in place** — a second
copy in a second location guarantees the two drift apart.

If the project has no `.claude/` directory yet, ask the user before creating
one — you are writing to their repo, and some teams standardize on
`.github/skills/` instead.

## Format

```markdown
---
name: validate-recipe
description: Verified build/test/run commands for <project name>. Used by /validate; also useful to any agent that needs to build, test, or launch this project.
---

# Validation recipe — <project name>

## Stack
<one line: e.g. "TypeScript monorepo (pnpm), Python worker in ./jobs">

## Tier 1 — static
- `<command>`            # <what it covers; noted quirks>

## Tier 2 — tests
- Full suite: `<command>`
- One file:   `<command with placeholder>`

## Tier 3 — runtime
- Start: `<command>` (background)
- Ready when: `<health URL or readiness line>`
- Stop: `<command / kill note>`

## Gotchas
- <env var that must be set, port conflicts, slow first build, …>

## Conventions (optional)
- <branch naming, PR description limits, test category/selector names,
  how this repo expects proofs to be captured, …>

Last verified: <YYYY-MM-DD> against <commit sha>
```

## Rules

- **Record only what succeeded this run.** A command you didn't execute, or
  that failed, has no place here — the whole value of the file is that every
  line is known-good (conventions are the one exception: record them as
  observed, not as executed).
- **Update on drift.** When a recorded command fails and you find a working
  replacement, replace the line and refresh `Last verified`. A stale recipe
  is worse than none — it burns the run's trust budget on a false lead.
- **Keep it short.** Commands and gotchas, not prose. The reader is an agent
  mid-run.
