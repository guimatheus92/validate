---
name: validate-dev
description: Development runbook for maintaining the validate plugin repo itself (the repo whose root holds commands/validate.md, skills/validate/, and evals/). Use this skill whenever editing any content under skills/, commands/, .github/prompts/, or evals/; whenever changing the coverage-declaration, regression-proof, banned-language, recipe, report, diff-hygiene, blocked-runtime, deployed-evidence, SKIP-taxonomy, or reachability rules — each lives on several hand-synced surfaces that must move in the same commit; whenever running or grading the eval suite or its With/Without Skill benchmark; and whenever cutting a release. Trigger on prompts like "change the regression-proof rules", "sync the banned-language list", "change the deployed-evidence rules", "run the evals", "add a stack playbook", "add a Tier 3 surface", or "cut a release" — even when the prompt does not mention syncing, because the sync map is exactly what is easy to miss.
---

# Developing the validate plugin

This repo IS the plugin: markdown (a command, a skill, reference docs) plus
three JSON manifests. AGENTS.md carries the compressed contributor guide;
this skill is the on-demand deep runbook for the three tasks where getting
it slightly wrong ships a silent regression: multi-surface rule edits,
running the eval suite, and cutting a release.

## Ground rules

- **Prompt-only, forever.** No compiled code, ever. If a feature seems to
  need code, it belongs in a different tool — the plugin's value is that it
  installs as text and runs identically on Copilot CLI and Claude Code.
- **Gating is prose, not hooks.** The done-gate lives in the skill's
  instructions. Never add Stop hooks or other host-specific enforcement;
  it breaks the dual-host guarantee.
- **No host-specific tool IDs in prompts.** Write "if a browser-automation
  MCP is available…" and degrade explicitly, so the same text works in
  hosts with different tooling.
- **Stack knowledge goes in `skills/validate/reference/stacks.md`; project
  knowledge goes in the user's recipe file** (written at run time in their
  repo). Never hardcode a specific project's commands in this repo.

## Surface map — rules that live on more than one file

The dispatcher (`commands/validate.md`) and the VS Code prompt
(`.github/prompts/validate.prompt.md`) deliberately duplicate compressed
copies of the skill's hard rules so they survive even when the skill body
is truncated from context. The price of that resilience: every rule change
must move ALL of its carriers in the same commit, or the copies drift and
the hosts disagree. Before editing any rule below, open every listed
surface; after editing, run the structural check and the guarding evals.

### Coverage declaration

Four surfaces, same commit:

1. `skills/validate/SKILL.md` — Step 3 (claims + will/cannot-validate + the
   nonfunctional not-claimed line + the plan-only trigger), the contract's
   per-claim verdict bullet, and Step 9's report enumeration
2. `skills/validate/reference/report.md` — claims table + claim roll-up
   rule + plan-must-match-report rule + the always-present "Not validated" line
3. `commands/validate.md` — the plan-only trigger + the per-claim
   hard-rules bullet (duplicated so the dispatcher stands alone)
4. `.github/prompts/validate.prompt.md` — the declare-coverage item, the
   per-claim verdicts item, + its report line

Keep the declaration stack-agnostic — never name products; the generic
nonfunctional dimensions (security, performance, scale, compatibility,
reliability, deployment) are the one fixed list it may name. Evals 7 and 10
guard the declaration contract; eval 17 guards per-claim verdicts; eval 20
guards the claimed-nonfunctional half.

### Regression proof

Source of truth: the "Regression proof" section of
`skills/validate/reference/evidence.md` (three modes — bug-fix baseline
proof; historical replay with tamper-check fallback for session-added
tests; new-feature tamper with the can-fail proof still required — plus
the hard Tier 2 cap). Compressed carriers to move in the same commit:

- `skills/validate/SKILL.md` — the Tier 2 bullet
- `skills/validate/reference/stacks.md` — the post-suite pointer
- `skills/validate/reference/report.md` — the Tier 2 appendix placeholder
- `commands/validate.md` — the hard-rules line
- `.github/prompts/validate.prompt.md` — item 4

Evals 0 and 11–16 guard this.

### Diff hygiene

Source of truth: the "Diff hygiene — universal Tier 1 checks" section of
`skills/validate/reference/scope.md`. Compressed carriers to move in the
same commit:

- `skills/validate/SKILL.md` — the Tier 1 bullet
- `skills/validate/reference/stacks.md` — the Tier 1 intro pointer
- `.github/prompts/validate.prompt.md` — item 3

Eval 18 guards this (the self-review item is deliberately unfixtured — see
Known gaps in `evals/README.md`).

### Banned language

`skills/validate/reference/evidence.md` is canonical. The list quoted in
`evals/evals.json` assertions is machine-checked against it by
`scripts/check.mjs` — edit evidence.md, run the check, and it names what
to sync. The copies in `commands/validate.md` and the VS Code prompt are
deliberately COMPRESSED pointers (a few examples + a link to evidence.md).
Never expand them into full lists; keep them pointers.

### Recipe

Two hand-synced pieces, each same-commit:

- **Read-order** — THREE carriers: `commands/validate.md` Step 2,
  `skills/validate/reference/recipe.md` (Location), and
  `skills/validate/SKILL.md` Step 0 item 1.
- **"Never run locally"** — recipe.md's template section + rules, and the
  honor clause in SKILL.md Step 0 item 1. A listed command is a
  prohibition (BLOCKED territory), which only narrows what runs — it never
  changes how anything is judged, so it does not collide with the
  untrusted-repo-content rule.

Eval 9 guards recipe reuse; the never-run prohibition is deliberately
unfixtured (see Known gaps in `evals/README.md`).

### Deployed evidence

Source of truth: `skills/validate/reference/deployed-evidence.md` — the
applicability gate (TRUE/FALSE/UNKNOWN), source discovery order, the
caller-first query order (the real deployed producer identified, its
caller-side telemetry read first, the two sides reconciled, service-only
rows out of the customer denominator until provenance resolves), the
ask/provide/waive protocol (never secrets, never self-waived, an explicit
in-prompt decision consumes the ask), the seven dimensions with their
status words (caller and service reachability split — NOT OBSERVED / NOT
MEASURABLE / NO TARGET ROWS / NOT DEPLOYED …), the query methodology
(identifiers from the emitting code, zero-inclusive positive controls,
payload-field inspection, correlation-id hierarchy, base rates,
provenance from a primary signal — an environment column reading
production is not one — deployment-state gating), and the boundaries
(read-only; recipe "Never run locally" wins; plan-only declares without
executing; the escalated Tier 3 runbook is never replaced). Compressed
carriers to move in the same commit:

- `skills/validate/SKILL.md` — the causal-vs-deployed contract bullet, the
  Step 2 gate decision, the Step 3 declaration bullet (status-free
  wording — eval 10), Step 7, and the reference-index row
- `skills/validate/reference/report.md` — the Verdict scope line, the
  dimension status table, the claim-classification and status-word
  bullets, and the Deployed evidence appendix placeholder
- `skills/validate/reference/recipe.md` — the Deployed evidence template
  section + the production-query clause of "Never run locally"
- `skills/validate/reference/runtime.md` — the local-vs-deployed pointer
- `commands/validate.md` — the hard-rules bullet + the plan-only sentence
- `.github/prompts/validate.prompt.md` — item 6

Evals 21–24, 26–31, and 32–36 guard the phase (zero-rows positive
controls, asserted-claim FAIL, waiver, required-BLOCKED, hidden protocol
failures, provenance, hierarchy, version gate, post-deploy effect, impact
separation, caller-first reachability, test-host provenance,
caller/service reconciliation, qualified degradation when no caller-side
source exists); keep evals 10 and 19 passing.
`scripts/check.mjs` check 7 requires the literal phrase "deployed
evidence" on every carrier and the caller-first sentinel on its carriers,
and check 9 pins the fixture telemetry data — both the service-side
`ops.jsonl` and the caller-side `outgoing.jsonl` literals.

### SKIP taxonomy and reachability

The three SKIP labels — `SKIP (not applicable)` / `SKIP (infeasible)` /
`SKIP (user-waived)` — are defined in evidence.md's "The four verdicts"
and machine-checked by `scripts/check.mjs` check 8: any `SKIP (…)` string
in the carriers or evals.json must be one of the canonical three. Carriers
to move with a label change: runtime.md (ladder rung 4 + the runbook
section), report.md (the SKIP-labels bullet), and the VS Code prompt's
verdicts item. Evals 1, 2, 14, 20, and 23 guard the labels; BLOCKED vs
infeasible: a named unlockable prerequisite is BLOCKED (eval 14), no path
at all is infeasible (eval 20).

Reachability's source of truth is the "Reachability" bullet in scope.md's
diff hygiene (every changed surface has a caller/consumer/registration;
dead code is a finding). Carriers: runtime.md's no-caller paragraph and
prompt item 3. Eval 25 guards it.

### Blocked-runtime runbook

`skills/validate/reference/runtime.md` ("When a runtime claim ends SKIP or
BLOCKED") is the source of truth for both forms — the 4–8-line short
runbook and the escalated staged plan (prerequisites, staged execution,
safety limits, deciding observation, rollback, sign-off) for complex
blocked claims; `skills/validate/reference/report.md` names where each
form surfaces (Next step vs Tier 3 evidence vs its own `## Runbook`
section). Same commit; eval 3 guards the short form staying short, eval 19
guards the escalation.

### Version lockstep

`plugin.json`, `.claude-plugin/plugin.json` (byte-identical to root), and
`.claude-plugin/marketplace.json` carry the version. Never edit versions
by hand — only `scripts/release.mjs` bumps them, and `scripts/check.mjs`
proves lockstep.

## The structural check

Run after every content edit:

```bash
node scripts/check.mjs
```

It proves: manifests in lockstep (real semver), skill frontmatter present,
no dangling reference links, the banned-language list in lockstep between
evidence.md and evals.json, the deployed-evidence sentinel present on
every carrier, the caller-first sentinel on its carriers, every `SKIP (…)`
label canonical, and the fixture telemetry JSONL (service `ops.jsonl` and
caller `outgoing.jsonl`) parsing with its semantic pins intact. It is the
entire local suite — there is nothing to build.

## Eval runbook

The skill is a prompt, and prompts regress silently: a wording change that
reads better can quietly stop producing regression proofs or start letting
hedged verdicts through. Re-run the evals after ANY change to `skills/`
content — before and after, like unit tests around a refactor.

1. **Build the fixtures**: `node evals/setup-fixtures.mjs <scratch-dir>` —
   one disposable git repo per fixture named in `evals/evals.json`, each
   with a `main` branch (pre-session state) and a `work` branch (the
   session's change).
2. **Run each eval**: give an agent `skills/validate/SKILL.md` plus the
   eval's `prompt`, executed inside that eval's fixture on the `work`
   branch with scope `main..HEAD`.
3. **Grade** the resulting report against that eval's `assertions`. The
   banned-language assertion is mechanical — grep the report for the
   phrases listed in evidence.md. The rest are graded by reading the
   report against the assertion text. Glossary and grading rules live in
   `evals/README.md`.
4. **Benchmark** (when measuring skill value, not just guarding a change):
   run each prompt a second time WITHOUT the skill — same model, same
   fixture — and grade the same way. The delta between the two columns is
   the skill's measured value.
5. **Record results** — date, per-eval breakdown, sample-size caveats — in
   `evals/README.md` only. Never restate the figures in the root README or
   anywhere else: duplicated tables drift.

Interpreting results:

- An assertion that fails WITH the skill means the edit broke a guarantee.
  Fix the skill text, not the assertion.
- An assertion that starts passing in the baseline means the base model
  got better; keep the assertion (it still guards regressions) but stop
  counting it as skill value.
- A new failure mode spotted in the wild gets a fixture + eval added
  FIRST, then the skill fix — so the fix is provable. Read the "Known
  gaps" section of `evals/README.md` before designing a new fixture; some
  rules are deliberately unfixtured and the reasons are documented there.

## Release

```bash
node scripts/release.mjs <patch|minor|major|x.y.z>
```

Bumps the three manifests, verifies no stale version is left behind, rolls
`CHANGELOG.md` (`[Unreleased]` → the new version), commits and tags. Push
is left to you.

Live smoke after a release: `/plugin marketplace add <path-to-this-repo>`,
then `/plugin install validate@validate` in a fresh Claude Code or Copilot
session, and run `/validate` in a repo with a recent change.
