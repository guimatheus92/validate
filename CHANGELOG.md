# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Two new evals**: `tamper-check-vacuous-test` (a new test that can never
  fail must be exposed by the tamper check, Tier 2 FAIL) and
  `unproven-fix-hard-fail` (a claimed fix whose covering test passes
  pre-fix must land Tier 2 FAIL, never a softened verdict). Suite is now
  thirteen scenarios over twelve fixtures.
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
