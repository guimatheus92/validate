# validate

Prompt-only validation plugin for Copilot CLI and Claude Code. One command —
`/validate` — proves an AI coding session's work is correct before anyone
calls it done: static checks (Tier 1), tests with regression proof (Tier 2),
live runtime verification (Tier 3), and a post-tier deployed-evidence phase
(telemetry/log/data sources) when the change touches deployed behavior —
each producing PASS/FAIL/BLOCKED/SKIP verdicts backed by evidence captured
during the run.

## No build, no tests to run — by design

There is no compiled code in this repo and there never should be. The plugin
is markdown (a command, a skill, reference docs) plus three JSON manifests.
The consistency check is the whole local suite:

```bash
node scripts/check.mjs   # manifests in lockstep (real semver), frontmatter present, no dangling reference links, banned-language list in lockstep between evidence.md and evals.json, deployed-evidence sentinel on every carrier, caller-first sentinel on its carriers, SKIP labels canonical, fixture telemetry data pinned
```

## Architecture

**Two-layer model:** thin slash command → skill with a router table →
reference files read on demand.

- `commands/validate.md` — the dispatcher both hosts load whole. Locates the
  skill via the path ladder (`$CLAUDE_PLUGIN_ROOT` → `~/.claude/plugins/cache`
  → `~/.copilot/installed-plugins`), loads a project recipe if present, and
  duplicates the four hard gating rules so they survive even if the skill
  body is truncated from context.
- `skills/validate/SKILL.md` — the methodology core: contract, step order,
  iron rules, and the reference index. Kept small; depth lives in
  `reference/`.
- `skills/validate/reference/*.md` — one topic each: `scope` (what to
  validate), `stacks` (Tier 1/2 playbooks per language), `runtime` (Tier 3
  surfaces + degradation ladder), `deployed-evidence` (the post-tier phase:
  applicability gate, source discovery, caller-first order, dimensions,
  query methodology),
  `evidence` (verdicts + SKIP taxonomy, banned language, regression proof,
  retry ceiling), `recipe` (persisting verified commands), `report` (output
  format).
- `.github/prompts/validate.prompt.md` — compressed contract for VS Code
  Copilot Chat users, who cannot load CLI plugins.
- `evals/` — the skill's regression suite: `evals.json` (scenarios +
  assertions) and `setup-fixtures.mjs` (builds the twenty-eight fixture
  repos). Re-run the evals after any change to `skills/` content.

## Key conventions

- **Prompt-only, forever.** If a feature seems to need compiled code, it
  belongs in a different tool. The value of this plugin is that it installs
  as text and runs anywhere both hosts run.
- **Gating is prose, not hooks.** The done-gate lives in the skill's
  instructions (evidence rules, banned language). Never add Stop hooks or
  other host-specific enforcement — it breaks the dual-host guarantee.
- **Version lives in 3 places** — `plugin.json`, `.claude-plugin/plugin.json`
  (byte-identical to root), `.claude-plugin/marketplace.json`. Only
  `scripts/release.mjs` bumps them; `scripts/check.mjs` proves lockstep.
- **No host-specific tool IDs in prompts.** Instructions say "if a
  browser-automation MCP is available…" and degrade explicitly, so the same
  text works in hosts with different tooling.
- **Stack knowledge goes in `reference/stacks.md`; project knowledge goes in
  the user's recipe file** (`.claude/skills/validate-recipe/SKILL.md` in
  their repo, written by the skill at run time). Never hardcode a specific
  project's commands here.
- **PR delivery is out of scope.** Server-side changed-file verification,
  PR-description limits, evidence comments, merge readback — /validate
  proves work, it does not deliver it. Those concerns belong to other
  tools.

## Testing the plugin

- Structural: `node scripts/check.mjs`.
- Behavioral: build fixtures with
  `node evals/setup-fixtures.mjs <dir>` and run the scenarios in
  `evals/evals.json` against the skill (each prompt runs in its fixture's
  `work` branch with scope `main..HEAD`); grade with the per-eval assertions.
- Live: `/plugin marketplace add <path-to-this-repo>` then
  `/plugin install validate@validate` in a Claude Code or Copilot session,
  and run `/validate` in a repo with a fresh change.
- Deeper runbook (surface map, eval procedure, release):
  `.claude/skills/validate-dev/SKILL.md` — loads automatically as a
  project skill when working in this repo.

## Common tasks

- **Add a stack playbook:** edit `skills/validate/reference/stacks.md` (both
  tier tables + the marker table).
- **Add a Tier 3 surface:** edit `skills/validate/reference/runtime.md`'s
  surface table.
- **Change the coverage-declaration rules:** the prose lives on FOUR
  surfaces that must be hand-synced in the same commit — SKILL.md (Step 3:
  claims + will/cannot-validate + the nonfunctional not-claimed line +
  plan-only trigger; plus the contract's per-claim verdict bullet and
  Step 9's report enumeration), report.md (claims table + claim roll-up
  rule + plan-must-match-report rule + the always-present Not validated
  line), commands/validate.md (the plan-only trigger + the per-claim
  hard-rules bullet, duplicated so the dispatcher stands alone), and
  .github/prompts/validate.prompt.md (the declare-coverage item + the
  per-claim verdicts item + its report line). Keep evals 7, 10, 17, and 20 passing. The declaration must
  stay stack-agnostic — never name products (the generic nonfunctional
  dimensions — security, performance, scale, compatibility, reliability,
  deployment — are the one fixed list it may name).
- **Change the report format:** edit `skills/validate/reference/report.md`;
  keep `report-has-per-tier-verdicts` in the evals passing.
- **Change the diff-hygiene checks:** the "Diff hygiene" section of
  `skills/validate/reference/scope.md` is the source of truth. Compressed
  carriers that must move in the same commit: SKILL.md's Tier 1 bullet,
  stacks.md's Tier 1 intro pointer, and
  .github/prompts/validate.prompt.md item 3. Keep eval 18 passing.
- **Change gating rules:** `skills/validate/reference/evidence.md` is the
  source of truth. The banned-language list in the eval assertions is
  machine-checked against it by `scripts/check.mjs` — edit evidence.md and
  the check tells you where to sync. The copies in `commands/validate.md`
  and `.github/prompts/validate.prompt.md` are deliberately COMPRESSED
  pointers (a few examples + a link to evidence.md), not full lists — keep
  them pointers; the same goes for the recipe read-order, hand-synced
  across THREE carriers (`commands/validate.md`, `reference/recipe.md`,
  and SKILL.md Step 0 — which also carries the "Never run locally"
  honor clause synced with recipe.md's rules).
- **Change the regression-proof rules:** the "Regression proof" section of
  `skills/validate/reference/evidence.md` is the source of truth (three
  modes — bug-fix baseline proof; historical replay with tamper-check
  fallback for session-added tests; new-feature tamper, no pre-state but
  the can-fail proof still required — plus the hard Tier 2 cap). Compressed
  carriers that must move in the same commit: SKILL.md's Tier 2 bullet,
  stacks.md's post-suite pointer, report.md's Tier 2 appendix placeholder,
  commands/validate.md's hard-rules line, and
  .github/prompts/validate.prompt.md item 4. Keep evals 0 and 11–16
  passing.
- **Change the deployed-evidence rules:** the new
  `skills/validate/reference/deployed-evidence.md` is the source of truth
  (applicability gate, source discovery, the caller-first query order and
  caller/service reachability split, the ask/provide/waive protocol,
  dimensions and their status words, query methodology, boundaries).
  Carriers that must move in the same commit: SKILL.md (the
  causal-vs-deployed contract bullet, the Step 2 gate decision, the Step 3
  declaration bullet — status-free wording, eval 10 —, Step 7, and the
  reference-index row), report.md (Verdict scope line + dimension status
  table + the claim-classification, status-word, and caller/service
  reachability bullets + the Deployed evidence appendix placeholder),
  commands/validate.md (the hard-rules bullet + the plan-only sentence),
  .github/prompts/validate.prompt.md item 6, recipe.md (the Deployed
  evidence template section, the caller-side rule bullet + the
  production-query clause of "Never run locally"), and runtime.md (the
  local-vs-deployed pointer). Evals 21–24, 26–31, and 32–35 guard the
  phase; keep evals 10 (plan-only stays status-free) and 19 (the escalated
  deploy runbook is not replaced by this phase) passing.
  `scripts/check.mjs` requires the literal phrase "deployed evidence" on
  every carrier and a caller-first sentinel on its carriers.
- **Change the SKIP taxonomy or the reachability check:** the three SKIP
  labels are defined in evidence.md's "The four verdicts" and
  machine-checked everywhere by `scripts/check.mjs` (any `SKIP (…)` must
  be one of the canonical three). Carriers: runtime.md (ladder rung 4 +
  the runbook section), report.md (the SKIP-labels bullet), and
  .github/prompts/validate.prompt.md (the verdicts item). Evals 1, 2, 14,
  20, 23 guard the labels. Reachability's source of truth is the
  "Reachability" bullet in scope.md's diff hygiene; carriers: runtime.md's
  no-caller paragraph and prompt item 3. Eval 25 guards it.
- **Change the blocked-runtime runbook rule:** the "When a runtime claim
  ends SKIP or BLOCKED" section of `skills/validate/reference/runtime.md`
  is the source of truth for both forms — the 4–8-line short runbook and
  the escalated staged plan for complex blocked claims (multi-system,
  deployment, load); `reference/report.md`'s rules name where each form
  surfaces in the report (Next step vs Tier 3 evidence vs its own
  `## Runbook` section). Move both files in the same commit and keep
  eval 3 (short form stays short) and eval 19 (escalation) passing.
- **Cut a release:** `node scripts/release.mjs <patch|minor|major|x.y.z>` —
  bumps the three manifests, verifies no stale version, rolls CHANGELOG,
  commits and tags (push left to you).
