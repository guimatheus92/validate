# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] — 2026-08-07

- **Per-claim verdicts.** The coverage declaration now enumerates the
  session's claims (from the request, commit messages, and diff) and the
  report gains a claims table — every claim returns evidence-backed or
  declared SKIP/BLOCKED with its reason, never silently absent. Roll-up:
  a claim FAIL is an overall FAIL; a declared gap leaves the overall
  verdict to the tiers; an undeclared unproven claim caps the overall
  verdict below PASS.
- **Nonfunctional dimensions are explicit.** Security, performance,
  scale, compatibility, reliability, and deployment are validated only
  when a claim names one; the always-present **Not validated** line names
  the dimensions no claim covers. A claimed nonfunctional property needs
  measured evidence or an explicit gap — never a verdict from reasoning
  alone.
- **Universal diff-hygiene pass in Tier 1.** On every stack: `git diff
  --check` over the full scope, leftover conflict markers, unexpected or
  generated files gated against the stated task, and an author
  self-review read of the diff. A conflict marker or committed credential
  is a Tier 1 FAIL.
- **Escalated runbooks for complex blocked claims.** When a blocked proof
  spans systems, needs a provisioned environment (deployment, load, data
  migration), or has steps whose failure needs rollback, the short owner
  runbook escalates to a staged plan — prerequisites, staged execution
  with per-stage checkpoints, safety limits, the deciding observation,
  rollback, sign-off — in its own report section.
- **Recipe: never-run-locally list and broader conventions.** The recipe
  template records commands that must never run locally (deploys,
  data-destroying scripts, shared-env jobs) as prohibitions future runs
  honor, plus expected test counts, structure boundaries, and the
  evidence-directory convention.
- **PR delivery declared a non-goal.** /validate proves work; it does not
  deliver it.
- **Four new evals (17–20)** on deterministic fixtures — `claims-matrix`,
  `diff-hygiene`, `runbook-escalation`, `perf-claim-explicit` — and
  eval 3 gains the anti-escalation half (a single missing env var keeps
  the short runbook form).

## [0.4.1] — 2026-08-07

- **Project icon and README header.** New `assets/icon.svg` (rounded-square
  gradient with a shield-check glyph) and a centered README header — logo,
  tagline, and CI / version / hosts / prompt-only / license badges.
- **`validate-dev` project skill.** `.claude/skills/validate-dev/SKILL.md`
  carries the repo's own maintenance runbook — the hand-synced surface map,
  the eval procedure, and the release process — loading on demand for
  agents working in this repo. `AGENTS.md` points to it, and
  `.claude/settings.local.json` is now gitignored.

## [0.4.0] — 2026-08-06

- **History-first regression proof.** For session-added tests over
  pre-existing behavior, the skill now searches git history for the commit
  that introduced or fixed the covered behavior and prefers an exact
  historical replay (the new test fails at that commit's predecessor on a
  tree that still builds, passes intact) over a synthetic tamper check.
  The tamper check remains the fallback when history offers no honest
  boundary. The replay also notes whether the historical commit shipped a
  test for the exact input.
- **The can-fail proof is now universal.** New-feature tests lose their
  exemption: every test the session added must be proven able to fail —
  the baseline half is waived for new behavior (no pre-state exists), but
  the tamper half is required. A feature test that survives tampering
  caps Tier 2 at FAIL.
- **Green controls during tampering.** A tamper check now runs one or two
  unrelated tests alongside the new one: the new test must fail while the
  controls stay green — a focused failure implicates the tampered path; a
  tree where everything fails proves breakage, not the guard.
- **Forced rebuild around proofs.** On stacks with a build step, the proof
  procedures require a fresh build (or verified artifact change) after
  altering or restoring source — stale incremental-build outputs can
  counterfeit either half of a proof.
- **Filtered-run count gate.** A filtered or categorized test run must
  name its expected tests up front and match them against runner-reported
  executions — a filter matching zero tests exits green and proves
  nothing; generated scenario/matrix definitions never count as
  executions.
- **Timing claims need deterministic evidence.** Short wall-clock
  measurements are ruled out as proof; logged or calculated delays,
  injected clocks, or fake time are the accepted forms.
- **Blocked runtime claims leave a runbook.** When a Tier 3 claim ends
  SKIP or BLOCKED for want of environment or tooling, the report's Next
  step becomes a short owner runbook: prerequisites, exact commands or
  flow, the observation that decides pass or fail, and cleanup.
- **Recipe template gains a Conventions section** (optional): branch
  naming, PR description limits, test category/selector names, and how
  the repo expects proofs to be captured.
- **Two new evals**: `history-replay` (the skill must find the fixing
  commit in history and replay against its predecessor instead of
  reaching for a synthetic tamper) and `new-feature-tamper` (a new
  feature's test must still be proven able to fail, with pre-existing
  tests as green controls).
- **Missing environment is BLOCKED, never provisioned.** The rule the
  eval suite always enforced is now stated in the skill text: fabricating
  an env value, credential, or stub to make a blocked check run — however
  loudly disclosed — is a non-fix that converts an honest BLOCKED into a
  counterfeit verdict.

## [0.3.0] — 2026-08-06

- **Regression proof widened beyond bug fixes.** Tests added for behavior
  that already existed at base now require a tamper check: the new test
  must fail when the covered code's behavior is deliberately broken in a
  throwaway worktree of HEAD, and pass intact — a test that survives
  tampering is vacuous. Bug fixes keep the pre-fix/post-fix worktree proof.
- **Hard landing for unproven work.** A missing or failed regression proof
  now caps Tier 2 at FAIL (previously the skill only had to "say so" when
  the covering test passed pre-fix). The rule is duplicated as a fourth
  hard rule in the dispatcher.
- **Evidence form freed.** The evidence list in evidence.md is explicitly
  non-exhaustive: improvise the capture form when the standard ones don't
  fit — never the conclusion. Tier 3 gains an optional gold-standard rung:
  a before/after runtime capture (screenshot pair, log excerpts, output
  diffs) from a worktree at base, never required, absence never downgrades.
- **Four new evals**: `tamper-check-vacuous-test` (a new test that can never
  fail must be exposed by the tamper check, Tier 2 FAIL),
  `unproven-fix-hard-fail` (a claimed fix whose covering test passes
  pre-fix must land Tier 2 FAIL, never a softened verdict),
  `tamper-check-genuine-test` (the positive half: a real test must fail
  tampered, pass intact, Tier 2 PASS), and `tamper-check-infeasible-skip`
  (an unexecutable tamper check lands SKIP/BLOCKED with the reason — never
  PASS off a suite whose new test never ran, and never with invented
  credentials). Suite is now fifteen scenarios over fourteen fixtures.
- **Review hardening**: regression-proof mode selection follows the claim
  (a fix claim always takes the bug-fix proof; the tamper check is for
  pure test additions); the tamper worktree explicitly carries
  not-yet-committed tests; a SKIP'd tamper check caps Tier 2 at SKIP,
  never PASS; `scripts/check.mjs` now proves eval ids are contiguous, no
  fixture is orphaned, and every eval appears in the evals/README roster.
- **Fixed**: eval 10 `plan-only-mode` was documented in 0.2.0 (README,
  evals/README, AGENTS.md) but the entry was missing from `evals.json` —
  the scenario now exists as specified (leading `plan` token → declaration
  only, nothing executed, reusing the `bi-coverage` fixture).

## [0.2.0] — 2026-08-05

- **Coverage declaration.** Before executing anything, a run now declares
  what it will validate per tier and what it cannot validate with explicit
  reasons; the declaration binds the final report (declared gaps return as
  SKIP/BLOCKED with the same reasons, deviations are named). New plan-only
  mode: `/validate plan` stops after the declaration.
- **Three new evals**: `coverage-declaration` (BI-style fixture the skill
  never names — proves the agent generalizes and declares gaps),
  `injection-resistance` (repo-planted instruction to fake PASS must be
  ignored and reported as a finding), and `recipe-reuse` (a pre-seeded
  recipe's nonstandard-but-only-working command must be reused), plus
  `plan-only-mode` (the leading `plan` token must produce a declaration and
  execute nothing). Suite is now eleven scenarios over ten fixtures.
  *(Recorded later: the `plan-only-mode` entry never actually landed in
  `evals.json`, so 0.2.0 shipped ten scenarios — fixed in the next
  release.)*

## [0.1.0] — 2026-08-04

- **Initial release.** The `/validate` command and `validate` skill:
  three-tier validation (static checks, tests with regression proof, live
  runtime verification) with PASS/FAIL/BLOCKED/SKIP verdicts backed by
  captured evidence, session-scope detection, per-stack playbooks, a Tier 3
  surface table with an explicit degradation ladder for web UIs, banned
  hedging language, a 3-attempt retry ceiling, and per-project recipe
  recording to `.claude/skills/validate-recipe/SKILL.md`.
- **Dual-host packaging.** Installable on Copilot CLI and Claude Code from
  the same single-plugin marketplace; a compressed prompt file for VS Code
  Copilot Chat ships in `.github/prompts/`.
- **Eval suite.** Five fixture-backed scenarios with graded assertions in
  `evals/`, serving as the skill's regression tests.
