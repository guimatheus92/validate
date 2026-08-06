# validate

Prompt-only validation plugin for Copilot CLI and Claude Code. One command —
`/validate` — proves an AI coding session's work is correct before anyone
calls it done: static checks (Tier 1), tests with regression proof (Tier 2),
and live runtime verification (Tier 3), each producing PASS/FAIL/BLOCKED/SKIP
verdicts backed by evidence captured during the run.

## No build, no tests to run — by design

There is no compiled code in this repo and there never should be. The plugin
is markdown (a command, a skill, reference docs) plus three JSON manifests.
The consistency check is the whole local suite:

```bash
node scripts/check.mjs   # manifests in lockstep (real semver), frontmatter present, no dangling reference links, banned-language list in lockstep between evidence.md and evals.json
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
  surfaces + degradation ladder), `evidence` (verdicts, banned language,
  regression proof, retry ceiling), `recipe` (persisting verified commands),
  `report` (output format).
- `.github/prompts/validate.prompt.md` — compressed contract for VS Code
  Copilot Chat users, who cannot load CLI plugins.
- `evals/` — the skill's regression suite: `evals.json` (scenarios +
  assertions) and `setup-fixtures.mjs` (builds the fourteen fixture repos).
  Re-run the evals after any change to `skills/` content.

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

## Testing the plugin

- Structural: `node scripts/check.mjs`.
- Behavioral: build fixtures with
  `node evals/setup-fixtures.mjs <dir>` and run the scenarios in
  `evals/evals.json` against the skill (each prompt runs in its fixture's
  `work` branch with scope `main..HEAD`); grade with the per-eval assertions.
- Live: `/plugin marketplace add <path-to-this-repo>` then
  `/plugin install validate@validate` in a Claude Code or Copilot session,
  and run `/validate` in a repo with a fresh change.

## Common tasks

- **Add a stack playbook:** edit `skills/validate/reference/stacks.md` (both
  tier tables + the marker table).
- **Add a Tier 3 surface:** edit `skills/validate/reference/runtime.md`'s
  surface table.
- **Change the coverage-declaration rules:** the prose lives on FOUR
  surfaces that must be hand-synced in the same commit — SKILL.md Step 3
  (declaration + plan-only trigger), report.md (plan-must-match-report rule
  + the Not validated line), commands/validate.md (the plan-only trigger,
  duplicated so the dispatcher stands alone), and
  .github/prompts/validate.prompt.md (the declare-coverage item + its Not
  validated line). Keep evals 7 and 10 passing. The declaration must stay
  stack-agnostic — never name products.
- **Change the report format:** edit `skills/validate/reference/report.md`;
  keep `report-has-per-tier-verdicts` in the evals passing.
- **Change gating rules:** `skills/validate/reference/evidence.md` is the
  source of truth. The banned-language list in the eval assertions is
  machine-checked against it by `scripts/check.mjs` — edit evidence.md and
  the check tells you where to sync. The copies in `commands/validate.md`
  and `.github/prompts/validate.prompt.md` are deliberately COMPRESSED
  pointers (a few examples + a link to evidence.md), not full lists — keep
  them pointers; the same goes for the recipe read-order duplicated between
  `commands/validate.md` and `reference/recipe.md`, which is hand-synced.
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
- **Cut a release:** `node scripts/release.mjs <patch|minor|major|x.y.z>` —
  bumps the three manifests, verifies no stale version, rolls CHANGELOG,
  commits and tags (push left to you).
