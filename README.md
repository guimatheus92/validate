<p align="center">
  <img src="assets/icon.svg" width="88" height="88" alt="validate" />
</p>

<h1 align="center">validate</h1>

<p align="center"><em>Prove the session's work is correct — before anyone calls it done.</em></p>

<p align="center">
  <a href="https://github.com/guimatheus92/validate/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/guimatheus92/validate/ci.yml?branch=main&label=CI&labelColor=1e1e2e&color=10b981" alt="CI" /></a>
  <a href="https://github.com/guimatheus92/validate/tags"><img src="https://img.shields.io/github/v/tag/guimatheus92/validate?label=version&labelColor=1e1e2e&color=14b8a6" alt="version" /></a>
  <img src="https://img.shields.io/badge/hosts-Copilot%20CLI%20%2B%20Claude%20Code-0ea5e9?labelColor=1e1e2e" alt="hosts" />
  <img src="https://img.shields.io/badge/prompt--only-no%20compiled%20code-14b8a6?labelColor=1e1e2e" alt="prompt-only" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0ea5e9?labelColor=1e1e2e" alt="license" /></a>
</p>

One command that proves an AI coding session's work is correct **before**
anyone calls it done. `/validate` detects what the session changed, runs the
project's static checks and tests (with regression proof for bug fixes), then
runs the real thing — CLI, API, or browser — and reports per-tier verdicts
backed by evidence captured during the run. No evidence, no "done".

```
/validate                    # detect the session's scope and validate it
/validate main..HEAD         # explicit commit range
/validate src/checkout/      # explicit paths
```

## Why

"Tests pass" is where most AI sessions stop — and it is not proof the change
works. It proves the CI suite runs. This plugin closes the gap with three
tiers under one verdict:

| Tier | Question it answers |
|---|---|
| 1 — static | Does it typecheck, lint, and build? |
| 2 — tests | Do the suites pass — and for a bug fix, does the covering test **fail without the fix**? |
| 3 — runtime | Does the running app actually behave correctly where the change lands? |

Verdicts are **PASS / FAIL / BLOCKED / SKIP**, per tier and overall. Every
PASS points at evidence captured this run: quoted output, exit codes,
response bodies, screenshots. Hedging ("should work", "probably", "seems
to") is banned from the report. After 3 failed fix attempts the run stops
and hands the decision to you instead of looping.

## Install

Works identically in a Copilot CLI session and a Claude Code session:

```
/plugin marketplace add guimatheus92/validate
/plugin install validate@validate
```

## Usage

- **Copilot CLI**: `/validate [scope]`
- **Claude Code**: `/validate:validate [scope]` (or bare `/validate` — see note below)
- **VS Code Copilot Chat**: copy
  [`.github/prompts/validate.prompt.md`](.github/prompts/validate.prompt.md)
  into your repo's `.github/prompts/` and run `/validate` in chat.

Scope defaults to the full range of the session's work — every commit on the
branch plus uncommitted changes, never just the last commit. Pass a range,
branch, or paths to override.

### What to say to the agent

The slash command is the explicit trigger, but the skill also fires on
natural language once the plugin is installed. Any of these work:

```
/validate
/validate main..HEAD
/validate src/checkout/
/validate plan          # dry-run: declare what would (and would not) be validated, run nothing

"Validate the work before we call it done."
"Prove this fix actually works — don't just run the tests."
"Is this done? Validate it properly: tests, regression proof, and run the app."
"We just added the export feature — validate it end to end."
```

What you get back is always the same shape: an overall verdict on line one,
a per-tier table (static / tests / runtime) — plus a deployed-evidence
status table, caller and service sides reported separately, and a
verdict-scope line when the change touches deployed
behavior — and an evidence appendix with the captured output. If the agent
answers with "should work" instead of a verdict, the skill did not run —
invoke the slash command explicitly.

Useful follow-ups after a run:

```
"Tier 2 is BLOCKED — here's the DATABASE_URL, rerun it."
"Record the recipe so next time is faster."        # writes .claude/skills/validate-recipe/SKILL.md by default
"Validate only the runtime tier for src/api/."
```

### The coverage plan (and `/validate plan`)

Before executing anything, the run declares its coverage: what it WILL
validate per tier, and what it canNOT validate with the reason (no tooling
in the environment, no credentials, artifact not locally executable — think
BI models, IaC applies, CI workflows). That declaration binds the final
report: declared gaps come back as SKIP/BLOCKED with the same reasons, and
nothing declared goes silently missing.

`/validate plan` stops right after the declaration — a cheap dry-run that
shows what a full run would and would not cover, without executing anything.

### Code-correct is not deployed-true

A pre-fix-fails / post-fix-passes proof shows the fix works where the run
executed it — it says nothing about whether the changed path is deployed,
executed by anyone, or failing in real data. When the change touches
deployed behavior (a bug fix to shipped code, a service route or worker, a
production mention in the request), the run adds a deployed-evidence phase
after the tiers: it discovers a telemetry/log/data source (your recipe, the
repo's docs, the code that emits operation names) and reads caller and
service reachability, failure incidence, provenance, and deployment state
from it — caller-first: the real deployed producer's outgoing-request
telemetry is read before service-side rows count as deployed traffic, and
an environment column reading "production" is never taken as proof of
customer traffic. It never
invents a cluster, table, or time window — if no source is discoverable it
asks you for non-secret coordinates or an explicit skip, and zero rows are
reported as "NOT OBSERVED in that source/window", never as "no impact".
The verdict line then carries a scope, e.g. *causal correctness PASS;
deployed incidence NOT OBSERVED; customer impact UNPROVEN*.

### Command name under Claude Code

Claude Code namespaces plugin commands as `/validate:validate`. If the bare
`/validate` does not resolve in your install, add a personal alias at
`~/.claude/commands/validate.md`:

```markdown
---
description: Prove the session's work is correct before calling it done.
---
Run the validate plugin: read the SKILL.md found by
`find ~/.claude/plugins/cache -name SKILL.md -path '*/validate/*/skills/validate/*' | sort -V | tail -1`
and follow it end to end with "$ARGUMENTS" as the scope override.
```

## The recipe file

On its first run in a project, `/validate` records what actually worked —
build command, test command, how to launch the app, health-check URL — to
`.claude/skills/validate-recipe/SKILL.md` in your repo. Later runs (and any
other agent) start from those verified commands instead of rediscovering
them. Only commands that succeeded are recorded; the file carries a
`Last verified` stamp.

## Example report

```markdown
# Validation: PASS

**Scope**: main..HEAD — 2 files changed
- src/sum.js (modified)
- test/sum.test.js (modified)

| Tier | Verdict | What ran | Evidence |
|---|---|---|---|
| 1 — static | SKIP | no linter/build configured | — |
| 2 — tests | PASS | npm test (2 passed) + regression proof | see appendix |
| 3 — runtime | PASS | consumer script against public export | see appendix |

## Evidence
### Tier 2
Pre-fix (worktree at main): the covering test FAILS — `8 !== 6` (negative dropped)
Post-fix: 2 passed, 0 failed, exit 0
...
```

## Project-specific knowledge

The built-in playbooks are stack-generic (JS/TS, Python, C#, Rust, Go, JVM,
Ruby, PHP, Elixir). Project knowledge enters two ways:

- the **recipe file** described above, written automatically;
- any skills already in your repo's `.claude/skills/`, `.github/skills/`,
  `.agents/skills/`, or `.copilot/skills/` — the run reads them and they
  outrank the generic playbooks.

## Evals

The skill ships with its own regression suite in [`evals/`](evals/): thirty-six
scenarios over twenty-eight disposable fixtures, each guarding a specific failure mode of "the work
is done" (fake regression proof, runtime PASS on a docs-only change, visual
claims without a browser, environment failures blamed on code, hedged
verdicts on untested projects, scope truncated to the last commit, weakening
a failing test to force a pass, undeclared coverage gaps, obeying repo-planted
fake-PASS instructions, ignoring the project recipe, executing anything
during a plan-only dry run, vacuous new tests that survive tampering, fixes
whose covering test already passed pre-fix, genuine new tests wrongly
rejected by the tamper procedure, credential-blocked tamper checks quietly
converted into PASS, synthetic tampers used where the repo's own history
held the honest boundary, new-feature tests exempted from the can-fail
proof, behavior claims blessed wholesale off a green suite, conflict
markers and stray artifacts no test can see, complex blocked deployments
compressed into a short note, performance claims silently absorbed
into a green functional verdict, deployed-data zero rows read as "no
impact" instead of NOT OBSERVED, asserted production claims riding a green
causal proof, self-waived or fabricated deployed-evidence sources, dead
surfaces validated as if live, protocol failures hidden under transport
success, synthetic traffic counted as customers, failures blamed on a
correlated operation instead of the actual one, post-fix production claims
while the fixed version is deployed nowhere, before/after effects measured
without the real deploy boundary, customer impact conflated with
occurrence, service-side rows read as deployed reachability before the
deployed caller's own telemetry is checked, asserted customer claims
satisfied by test-host service rows, rows counted as customer traffic
because an environment column says production, and caller/service
telemetry disagreements resolved by assumption instead of provenance).
Every run is benchmarked **With Skill**
against a **Without Skill** baseline — the same model and prompt with no
skill — so the skill's value is measured, not assumed.

To run them, ask an agent in this repo:

```
"Run the validate eval suite: build the fixtures with
 node evals/setup-fixtures.mjs <tmp-dir>, then execute each prompt from
 evals/evals.json in its fixture (work branch, scope main..HEAD) with the
 skill, and grade the report against that eval's assertions."
```

Results live in one place — [`evals/README.md`](evals/README.md): the
latest benchmark with its date and sample-size caveats, the per-eval
breakdown, the glossary, and grading instructions. The figures are
deliberately not restated here: they come from single-run iterations and
duplicating them would mean two tables to keep in lockstep by hand.

## Further reading

| Topic | Doc |
|---|---|
| What gets validated (scope, monorepos) | [skills/validate/reference/scope.md](skills/validate/reference/scope.md) |
| Stack detection + Tier 1/2 playbooks | [skills/validate/reference/stacks.md](skills/validate/reference/stacks.md) |
| Tier 3 surfaces + degradation ladder | [skills/validate/reference/runtime.md](skills/validate/reference/runtime.md) |
| Deployed evidence (is the fix live, is the failure real) | [skills/validate/reference/deployed-evidence.md](skills/validate/reference/deployed-evidence.md) |
| Verdicts, evidence rules, regression proof | [skills/validate/reference/evidence.md](skills/validate/reference/evidence.md) |
| The recipe file format | [skills/validate/reference/recipe.md](skills/validate/reference/recipe.md) |
| Report format | [skills/validate/reference/report.md](skills/validate/reference/report.md) |

## License

[MIT](LICENSE)
