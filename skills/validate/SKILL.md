---
name: validate
description: Prove an AI coding session's work is correct before calling it done. Use whenever the user asks to validate, verify, prove, test, or confirm that a fix, feature, refactor, or commit actually works — and before ANY claim that work is "done", "ready", "fixed", "working", or "complete", even if the user didn't explicitly ask for validation. Runs three tiers — static checks (typecheck/lint/build), tests with regression proof, and live runtime verification (run the CLI, hit the API, drive the browser) — and reports PASS/FAIL/BLOCKED/SKIP verdicts backed by evidence captured this run.
---

# validate — prove it before you say it

The work of this skill is producing **evidence**, not opinions. A session that
fixed a bug or added a feature has produced claims; your job is to convert
each claim into a verdict backed by something you captured while running the
code. Until then, the work is not done — it is merely written.

## The contract

- You may not declare the work correct. Only evidence may. Every claim in
  your final report is either backed by captured output or marked as
  unverified — and unverified means the overall verdict is not PASS.
- Verdicts are **PASS / FAIL / BLOCKED / SKIP**, per tier and overall.
  Definitions and evidence rules: [reference/evidence.md](reference/evidence.md).
- Green checks alone are not proof the change works — they prove you can run
  CI. Runtime observation (Tier 3) is what proves behavior, which is why it
  is a tier and not an afterthought.

## Step 0 — reuse what the project already knows

Before discovering anything from scratch:

1. **Recipe.** If `validate-recipe` exists (checked in order:
   `.claude/skills/validate-recipe/SKILL.md`, `.github/skills/…`,
   `.agents/skills/…`), read it and use its verified commands. It records
   what worked last time — rediscovering it wastes the run.
2. **Project skills.** Glob `.claude/skills/`, `.github/skills/`,
   `.agents/skills/`, `.copilot/skills/` for skills describing how this
   project builds, tests, or runs. A project's own instructions beat any
   generic playbook in this skill — always.
3. **Available tooling.** Note what verification tooling this session has:
   browser automation MCP (Playwright, Chrome DevTools), HTTP clients,
   project-installed test runners. You will pick Tier 3 methods from what
   actually exists — never name a tool you haven't confirmed.

## Step 1 — establish the scope

What exactly are you validating? Follow
[reference/scope.md](reference/scope.md). The short version: the full range
of the session's work — all its commits plus uncommitted changes, never just
`HEAD~1` — unless the user passed an explicit range, branch, or path list.
The changed-file list you produce here drives every later decision.

## Step 2 — detect the stack and pick the strategy

Follow [reference/stacks.md](reference/stacks.md): identify the stack from
marker files, then prefer the project's own entry points (npm scripts,
Makefile, CI workflows) over raw tool invocations. Decide, before running
anything, which commands constitute Tier 1 and Tier 2 for this project and
which surface Tier 3 must drive.

## Steps 3–5 — the three tiers

Run the tiers in order. A FAIL in an earlier tier does not excuse skipping a
later one when it can still run meaningfully — a lint error shouldn't hide a
broken runtime — but the overall verdict is FAIL the moment any tier fails.

- **Tier 1 — static**: typecheck, lint, build. Missing from the project =
  SKIP with the reason stated, not silently absent.
- **Tier 2 — tests**: the project's suites (unit, integration, E2E). For a
  bug fix, this tier is not satisfied by "tests pass" — it requires
  regression proof: the covering test fails without the fix and passes with
  it. Procedure in [reference/evidence.md](reference/evidence.md).
- **Tier 3 — runtime**: run the real thing and observe the changed behavior.
  Surface selection, drive methods, launch discipline, and the degradation
  ladder when browser tooling is missing:
  [reference/runtime.md](reference/runtime.md).

## Iron rules

These hold everywhere, including your final message:

- **Memory is not evidence.** Anything you assert was captured this run, or
  it is not evidence. "It worked earlier in the session" means run it again.
- **Ambiguous output is FAIL**, not PASS-with-a-shrug. If you cannot tell
  from the capture whether it worked, it didn't.
- **Three fix attempts, total.** You may fix-and-rerun at most 3 times across
  the whole validation. After that, stop and report FAIL with everything you
  captured — the human decides next.
- **Never weaken a check to pass it.** Loosening an assertion, skipping or
  deleting a failing test, widening a lint ignore — each of those is a FAIL
  wearing a disguise, and you report it as FAIL.
- **No hedging.** The banned-language list in
  [reference/evidence.md](reference/evidence.md) applies to every sentence
  you write about the work's correctness.

## Step 6 — record the recipe

If this run discovered anything a future run would need — the working build
command, how to launch the app, the health-check URL — persist it per
[reference/recipe.md](reference/recipe.md). Record only what actually
succeeded this run. First run in a project without `.claude/`? Ask before
creating it.

## Step 7 — report

Produce the final report exactly per
[reference/report.md](reference/report.md): overall verdict first, per-tier
table, evidence appendix. Print it verbatim — no summary prose above it, no
hedging below it.

## Reference index

| When you need… | Read |
|---|---|
| What range/files to validate, monorepo grouping | [reference/scope.md](reference/scope.md) |
| Stack detection, Tier 1/2 commands per language | [reference/stacks.md](reference/stacks.md) |
| Tier 3 surfaces, drive methods, launch discipline, degradation ladder | [reference/runtime.md](reference/runtime.md) |
| Verdict definitions, evidence rules, banned language, regression proof, retry ceiling | [reference/evidence.md](reference/evidence.md) |
| Recipe file location, format, update rules | [reference/recipe.md](reference/recipe.md) |
| Final report template | [reference/report.md](reference/report.md) |
