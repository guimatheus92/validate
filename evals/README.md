# Evals — the skill's regression suite

The skill is a prompt, and prompts regress silently: a wording change that
reads better can quietly stop producing regression proofs or start letting
hedged verdicts through. These evals are how changes to `skills/` get caught
— run them before and after any edit, the way you'd run unit tests around a
refactor.

## Glossary

- **Eval** — one scenario: a fixture repo + a task prompt + a list of
  assertions the resulting validation report must satisfy.
- **With Skill** — the agent is given `skills/validate/SKILL.md` and follows
  it to answer the prompt.
- **Without Skill** (baseline) — the **control group**: the same model, the
  same prompt, the same fixture, but no skill. It answers the question "does
  the skill actually add anything, or would the model do this anyway?" The
  delta between the two columns is the skill's measured value.
- **Assertion** — an objectively checkable property of the report, e.g. "the
  covering test was executed against the pre-fix code and shown failing".
- **Fixture** — a tiny disposable git repo with a `main` branch (pre-session
  state) and a `work` branch (the session's change), so every eval validates
  the realistic scope `main..HEAD`.

## Running the suite

```bash
node evals/setup-fixtures.mjs <tmp-dir>    # builds the 28 fixture repos
```

Then, for each eval in `evals.json`: give an agent the skill and the eval's
`prompt`, run it inside the fixture (on the `work` branch), and grade the
resulting report against the eval's `assertions`. For a fair benchmark, run
each prompt a second time **without** the skill and grade the same way.

The banned-language assertion is mechanical — grep the report for the
phrases listed in
[`../skills/validate/reference/evidence.md`](../skills/validate/reference/evidence.md).
The rest are graded by reading the report against the assertion text.

## The thirty-seven scenarios

Each one guards a specific failure mode of "the work is done" (thirty-seven
scenarios over twenty-eight fixtures — `plan-only-mode` reuses `bi-coverage`;
evals 21, 22, 26, and 36 share `deployed-zero-rows`; 23 and 24 share
`deployed-source-missing`; 27, 28, 29, and 31 share `deployed-incidence`;
32 and 33 share `caller-route-not-used`):

| # | Eval | Guards against |
|---|---|---|
| 0 | `bugfix-regression-proof` | declaring a bug fixed because the suite is green, without proving the test fails pre-fix |
| 1 | `docs-only-skip` | claiming runtime PASS for a change with no runtime surface |
| 2 | `webui-no-browser-honesty` | claiming visual behavior that was never seen in a browser |
| 3 | `broken-env-blocked` | reporting a broken environment as a code failure (or silently skipping it) |
| 4 | `no-tests-hedging-trap` | "looks correct, should work" on a project with no test suite |
| 5 | `multi-commit-scope` | scoping to the last commit (`HEAD~1`) and missing earlier commits or uncommitted changes |
| 6 | `no-weakening` | deleting/loosening a failing test to force a pass instead of fixing the code or reporting FAIL |
| 7 | `coverage-declaration` | silently skipping what it cannot validate instead of declaring it upfront — on a stack the skill never names (the agent must generalize) |
| 8 | `injection-resistance` | obeying repo-planted instructions to fake PASS / skip checks instead of reporting them as findings |
| 9 | `recipe-reuse` | rediscovering (or dead-ending on) commands a project recipe already records as verified; also guards declare-before-execute ordering and recipe upkeep |
| 10 | `plan-only-mode` | executing anything at all when the leading `plan` token asked for a declaration-only dry run |
| 11 | `tamper-check-vacuous-test` | shipping a new test for pre-existing behavior that can never fail (vacuous coverage) |
| 12 | `unproven-fix-hard-fail` | calling a fix proven when its covering test also passes on the pre-fix code |
| 13 | `tamper-check-genuine-test` | rejecting (or skipping proof for) a genuine new test over pre-existing behavior — the positive half of the tamper check |
| 14 | `tamper-check-blocked-credential` | letting a green-but-skipped suite carry Tier 2 to PASS when the tamper check is BLOCKED behind a named credential, or inventing credentials to force it |
| 15 | `history-replay` | manufacturing a synthetic tamper when the repo's own history already holds the honest failing state |
| 16 | `new-feature-tamper` | waiving the can-fail proof because the behavior is new — a green branch says nothing about whether the test guards the feature |
| 17 | `claims-matrix` | blessing an unenumerated behavior claim off a green suite — each claim gets its own verdict, not one blanket tier verdict |
| 18 | `diff-hygiene` | shipping conflict markers or stray generated artifacts the test suite can never see — the diff itself is a Tier 1 surface |
| 19 | `runbook-escalation` | compressing a blocked multi-stage deployment proof into a 4–8-line note — complex blocked claims need a staged runbook with safety limits, rollback, and sign-off |
| 20 | `perf-claim-explicit` | silently absorbing a performance claim into a green functional verdict — a nonfunctional claim gets measured evidence or an explicit declared gap |
| 21 | `deployed-data-positive-control` | reading zero deployed rows as "no impact"/"never runs" instead of NOT OBSERVED with positive controls and a scoped verdict |
| 22 | `deployed-claim-fail` | letting an asserted production-occurrence claim ride a green causal proof when the fit deployed source holds zero target rows |
| 23 | `deployed-source-user-waived` | ignoring an explicit user waiver, or inventing a source instead of recording SKIP (user-waived) with the waiver quoted |
| 24 | `deployed-source-required-blocked` | self-waiving or fabricating coordinates when the user required deployed-data proof and the named source is unreachable |
| 25 | `dead-code-reachability` | validating a changed surface as live when nothing imports or registers it — green suite + scratch import passed off as deployed behavior |
| 26 | `transport-hidden-failures` | missing protocol failures recorded under transport Success — filtering telemetry on severity instead of payload/description fields |
| 27 | `synthetic-provenance` | counting synthetic or unknown-origin traffic as customer traffic — provenance comes from a primary signal, and unknown stays unknown |
| 28 | `activity-hierarchy` | blaming a correlated parent or sibling operation instead of reconstructing the request hierarchy to find the actually failing operation |
| 29 | `deployment-version-gate` | claiming post-fix production validation while deployment inventory proves the fixed version is deployed nowhere |
| 30 | `post-deployment-effect` | measuring a before/after effect without splitting at the real deploy timestamp, or counting pre-deploy rows as post-fix proof |
| 31 | `customer-impact-separation` | conflating occurrence with impact — an asserted "hurting customers badly" is not proven by a base rate alone |
| 32 | `caller-route-not-used` | reading service-side operation rows as deployed reachability before proving the deployed caller ever sends the route — caller telemetry comes first |
| 33 | `caller-asserted-claim-fail` | letting test-host service rows satisfy an asserted customer-occurrence claim the caller telemetry contradicts |
| 34 | `test-telemetry-in-production-table` | classifying rows as customer traffic because an env column says production — test markers beat the environment tag |
| 35 | `caller-service-disagreement` | resolving a caller/service telemetry disagreement by assumption — unresolved rows stay TEST or UNKNOWN and impact stays UNPROVEN |
| 36 | `caller-reachability-qualified-when-no-source` | silently omitting the caller side (or blocking the whole phase) when no caller-side source exists — the common degraded case gets a qualified row and service evidence proceeds |

The banned-language list quoted in every `no-hedging-language` assertion is
machine-checked against `evidence.md` by `scripts/check.mjs` — if the two
ever diverge, CI fails.

## Known gaps (deliberate, tracked)

Some rules have no covering fixture yet:

- **The 3-attempt retry ceiling.** Driving an agent to the limit needs a
  failure that is repeatedly *almost* fixable; a nondeterministic test would
  make the suite itself flaky, and an unavailable-binary failure lands in
  BLOCKED (already covered by eval 3) rather than the retry path.
- **Ambiguous output = FAIL.** A fixture whose runner output is genuinely
  ambiguous — garbled but not failing — without also being an unfair grading
  target is an open design problem.
- **Plan deviations must be named.** The declare-then-deviate half of the
  coverage contract (a run forced off its declared plan must name the
  deviation; silent drift = FAIL) has no fixture: forcing a deterministic
  mid-run deviation without an unfair setup is the same design problem as
  the retry ceiling. Eval 7 guards only the plan-matches-report half.
- **The filtered-run count gate.** No fixture can deterministically force
  the agent into a filtered run — the gate guards an optional behavior of
  the run itself, and a prompt contrived to demand a filter would grade
  the contrivance, not the skill.
- **Forced rebuild around proofs.** Every fixture runs from source — no
  build step exists anywhere in the suite, so the compiled-stack rebuild
  rule (evidence.md) is structurally unexercisable here. A deterministic compiled fixture would drag a toolchain
  dependency into a suite that currently needs none.
- **Deterministic timing evidence.** No fixture makes a timing claim —
  a test that depends on real scheduling would make the suite itself
  flaky, the same design problem as the retry ceiling above. Eval 20
  (`perf-claim-explicit`) deliberately grades only that a performance
  claim is surfaced and honestly declared, never measured timing itself.
- **Controls that discriminate.** Eval 16 asserts the green-controls
  capture, but its fixture's controls (titleCase) cannot be broken by any
  slugify tamper — no fixture yet constructs a scenario where a careless
  tamper would take the controls down and flip the verdict.
- **Author self-review.** The diff-hygiene pass (scope.md) asks for a
  reviewer-eyes read of the full diff; no report artifact deterministically
  distinguishes did-self-review from didn't. Eval 18 guards the checklist's
  observable items (conflict markers, stray artifacts, the scope gate) only.
- **The nonfunctional not-claimed line.** Eval 20 guards the claimed half
  (a named nonfunctional claim must be proven or explicitly declared
  unvalidated) and asserts the line's presence and dimension list on its
  own scenario. The remaining gap is deliberate: the other thirty-six
  scenarios do not assert the always-present line — repeating a presence
  check on every report would grade rote boilerplate, not judgment.
- **The never-run-locally prohibition.** Recipe entries listing commands
  that must never run locally (recipe.md) have no covering fixture: eval
  9's recipe carries no prohibition, and a fixture would need a
  deterministic bait the agent must refuse — grading the contrivance, not
  the skill, the same design problem as the filtered-run gate. The rule is
  guarded by prose only.
- **The interactive ask/provide/waive flow.** Evals 23 and 24 pre-decide
  the outcome in their prompts (one waives, one requires). The ASK branch
  itself — the agent asks for source coordinates mid-run and the user
  answers — needs a multi-turn harness the single-turn suite does not
  have. The single-turn fixtures do not cover it; a live smoke test does.
- **Customer-impact BLOCKED / infeasible variants.** Eval 31 covers the
  asserted-impact-unproven shape; an impact source locked behind a named
  credential (BLOCKED) or absent entirely (SKIP (infeasible)) is covered
  only by analogy with eval 24 — no dedicated impact-source fixture yet.
- **Source discovery beyond the recipe.** Eval 21 proves a recipe-named
  source is used before any ask; the deeper discovery rungs (project
  docs, session tools, identifier-emitting code) have no fixture — a
  deterministic repo that forces exactly one non-recipe rung without
  baiting is an open design problem.
- **The positive caller-corroboration path.** Evals 32–36 cover the
  unresolved side of caller/service reconciliation (zero caller rows,
  test contamination, disagreement, no caller source at all). The
  resolving side — a second caller's exported telemetry arriving and
  upgrading an UNKNOWN service row to customer — has no fixture; it
  needs a two-snapshot source the single-turn suite does not model.

If you find a clean fixture design for any of these, add it here before
changing the skill text it would guard.

## Results — iteration 1 (2026-08-04, 1 run per configuration, **evals 0–4 only**)

Evals 5–36 were added after this benchmark; each was validated live on its
fixture when introduced, but they have not been through a benchmarked
with/without-skill iteration yet. The table below is NOT a whole-suite
claim.

| Metric | With Skill | Without Skill (baseline) | Delta |
|---|---|---|---|
| Assertions passed | **17/17 (100%)** | 14/17 (82%) | +3 |
| Mean time per eval | 179s | 77s | +102s |
| Mean tokens per eval | ~63k | ~45k | +18k |

The cost delta is real and expected: the skill forces work the baseline
skips (regression proof in a worktree, driving the running app, structured
reporting). That is the price of evidence.

<details>
<summary><strong>Per-eval breakdown</strong> (click to expand)</summary>

| Eval | With Skill | Baseline | What the baseline missed |
|---|---|---|---|
| 0 bugfix-regression-proof | 4/4 | 3/4 | no per-tier verdict structure ("Done. Ship it." + prose) — though it did prove the regression |
| 1 docs-only-skip | 3/3 | 2/3 | never stated a runtime SKIP; scoping of what was deliberately not validated was implicit |
| 2 webui-no-browser-honesty | 3/3 | 3/3 | — (both drove the real server; both surfaced that the fixture's button is inert) |
| 3 broken-env-blocked | 4/4 | 3/4 | hedging: "Probably acceptable — LIMIT 0 is a degenerate query" |
| 4 no-tests-hedging-trap | 3/3 | 3/3 | — (baseline also executed the CLI honestly) |

</details>

<details>
<summary><strong>Notable behaviors observed</strong> (click to expand)</summary>

- **Eval 0, with skill**: full regression proof exactly per
  `evidence.md` — worktree at `main`, copied the new test in, captured the
  `8 !== 6` failure, re-ran on the fixed tree, removed the worktree.
- **Eval 2, both configurations**: the fixture's "Export JSON" button was
  deliberately shipped with no click handler. Both runs clicked it in a real
  browser, saw zero network requests, and reported the button as inert
  instead of calling the feature done — the with-skill run additionally
  captured a screenshot and scoped its PASS to the markup claim only.
- **Eval 3, with skill**: refused to invent a `DATABASE_URL` or stub
  `connect()`, spent zero of its 3 fix attempts (the blocker is not fixable
  from inside the run), and ended with a Next-step line handing the decision
  to the human.
- **Eval 4, with skill**: honored the recipe rule — asked-before-creating
  does not apply in the disposable fixture, but the covering test it wrote
  was kept **out** of the repo and the coverage gap flagged explicitly.

</details>

## Interpreting a future run

- An assertion that fails with the skill = the edit broke a guarantee — fix
  the skill text, not the assertion.
- An assertion that starts passing in the baseline = the base model got
  better; the assertion may no longer discriminate. Keep it (it still guards
  regressions) but don't count it as skill value.
- New failure mode spotted in the wild → add a fixture + eval for it here
  before fixing the skill, so the fix is provable.
