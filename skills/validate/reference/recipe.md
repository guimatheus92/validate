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

## Deployed evidence (optional)
- Applicability: <which changes warrant the phase in this repo>
- Caller source: <outgoing/client request telemetry, gateway logs>; dataset: <name> (optional)
- Service source: <system>; dataset/table: <name>; default window: <e.g. 30d>
- Identifier derivation: <file/pattern where operation or metric names are emitted>
- Caller route normalization: <raw URL → route family mapping> (optional)
- Caller positive controls: <known-live sibling route to quote beside a zero> (optional)
- Service positive controls: <query proving the service source live>
- Provenance fields: <caller role/version, test markers, source-path columns> (optional)
- Correlation fields: <ids that join request → operation>
- Deployment source: <how to read which version is deployed where>
- Auth: <non-secret instructions — login command, SSO note; never tokens>
- Never query: <tables/scopes off-limits>

## Never run locally (optional)
- `<command/script>`     # <why: deploys, destroys data, hits a shared env>

## Conventions (optional)
- <branch naming, PR description limits, test category/selector names,
  expected test counts per category, structure boundaries (which dirs a
  change may touch), evidence/artifact directory, how this repo expects
  proofs to be captured, …>

Last verified: <YYYY-MM-DD> against <commit sha>
```

## Rules

- **Record only what succeeded this run.** A command you didn't execute, or
  that failed, has no place here — the whole value of the file is that every
  line is known-good (conventions and "Never run locally" entries are the
  exception: record them as observed — from CI config, deploy scripts,
  project docs — not as executed). Deployed-evidence sources follow the
  same rule: record a source only after a query against it succeeded this
  run.
- **Record the caller side when one exists.** Caller reachability is
  proven from the caller-side source before service rows count
  ([deployed-evidence.md](deployed-evidence.md)) — a recipe that
  records only a service source leaves every future run re-deriving
  (or missing) the producer. Optional fields stay omitted when the
  repo has no such source; do not invent one to fill the template.
- **"Never run locally" entries are prohibitions for future runs.** A listed
  command is BLOCKED territory, not a dare: a claim only that command could
  prove ends BLOCKED with a runbook, never with the command executed. This
  includes production queries — a listed query stays BLOCKED even when the
  user supplies coordinates mid-run; their remedy is editing the recipe.
- **Update on drift.** When a recorded command fails and you find a working
  replacement, replace the line and refresh `Last verified`. A stale recipe
  is worse than none — it burns the run's trust budget on a false lead.
- **Keep it short.** Commands and gotchas, not prose. The reader is an agent
  mid-run.
