# Report — the final output format

Print the report exactly in this shape, verbatim — no introductory prose
above it, no hedged commentary below it. The report IS the answer.

```markdown
# Validation: <one-line overall verdict — PASS | FAIL | BLOCKED>

**Verdict scope** (mandatory whenever the deployed-evidence phase applied):
<e.g. causal correctness PASS; deployed incidence NOT OBSERVED; customer
impact UNPROVEN>

**Scope**: <range or paths> — <N> files changed
<changed-file list, or the notable subset with a count for the rest>

| Tier | Verdict | What ran | Evidence |
|---|---|---|---|
| 1 — static | PASS | `npm run lint`, `tsc --noEmit` | exit 0 / exit 0 |
| 2 — tests | PASS | `npm test` (142 passed) + regression proof | see appendix |
| 3 — runtime | PASS | drove /checkout flow, 3 screenshots | see appendix |

| Claim | Verdict | Evidence |
|---|---|---|
| negative values no longer dropped by sum() | PASS | Tier 2 regression proof (appendix) |
| /checkout shows the corrected total | PASS | Tier 3 screenshots (appendix) |

<only when the deployed-evidence phase applied or was waived:>
| Dimension | Status | Source / window | Evidence |
|---|---|---|---|
| Reachability | NOT OBSERVED | ops.jsonl / 2026-08-01..07 | appendix — 0 target rows, siblings live |
| Failure incidence | NOT MEASURABLE — 0 eligible target operations | same | appendix |

**Not validated**: <each gap declared in the coverage plan, with its reason,
ending with the nonfunctional dimensions no claim covered (security,
performance, scale, compatibility, reliability, deployment) — this line is
never omitted>

## Evidence

### Tier 1
<command → exit code, and the lines that matter, quoted>

### Tier 2
<runner summary quoted; regression proof side by side — bug fix: the
pre-fix FAIL capture and the post-fix PASS capture; any session-added test
(pre-existing behavior or new feature): the historical-predecessor FAIL
capture, or the tampered-tree FAIL capture with unrelated controls green,
plus the intact-tree PASS capture; filtered runs: expected vs
runner-reported executions>

### Tier 3
<what was driven, the captured output/response/screenshot paths, and what
each capture shows>

### Deployed evidence
<only when the phase applied: the queries run, the row counts or excerpts
quoted, the positive-control counts beside any zero-row result>
```

Rules:

- **Overall verdict first.** The reader decides "ship or not" from line one;
  everything after is supporting detail.
- Overall is PASS only when every tier is PASS or SKIP. Any FAIL → overall
  FAIL. Any BLOCKED (and no FAIL) → overall BLOCKED.
- Claim verdicts roll up the same way: any claim FAIL → overall FAIL. A
  claim SKIP or BLOCKED whose gap was declared — it appears under **Not
  validated** with its reason, plus its runbook when runtime — leaves the
  overall verdict to the tiers; an undeclared unproven claim makes the
  overall verdict not PASS. Model such a gap at claim level, not tier
  level: no harness in the project to measure it → claim SKIP; an
  existing path stopped by a named missing prerequisite → claim BLOCKED —
  either way the tier that did run its checks keeps its own verdict.
- Every PASS row must point at evidence that exists in the appendix. A row
  that can't is not PASS — fix the verdict, not the appendix.
- SKIP and BLOCKED rows carry their reason in the "What ran" column
  (`SKIP (not applicable)` — docs-only change / BLOCKED — "no DATABASE_URL
  in env — needed to start the app"). SKIP always wears one of the three
  labels from [evidence.md](evidence.md).
- **Deployed-evidence statuses are evidence statuses, not verdicts.** They
  never enter the tier roll-up — "every tier is PASS or SKIP" reads
  exactly as written. They reach the overall verdict only through the
  claims table, per the classification below.
- **Classify each deployed item before executing it**
  ([deployed-evidence.md](deployed-evidence.md)): an **asserted** deployed
  claim (the user, commits, or work item state a production fact) is a
  claims-table row — zero target rows in a fit source = FAIL; source
  unavailable and not waived = BLOCKED. An **explicitly required check**
  (the user asked a question) is PASS when a fit source answers it
  conclusively, including a NOT OBSERVED answer. A **supplemental**
  dimension the validator added is not a claim — blocked or not-observed,
  it is a declared gap under **Not validated** with a runbook, and the
  declared-gap rule above already yields the scoped PASS.
- **The status words are not interchangeable.** NOT OBSERVED = a live
  source was queried and held zero target rows; UNPROVEN = no source
  answered the question; BLOCKED = a defined path with a named missing
  prerequisite; SKIP = one of the three labels. Never trade one for
  another — "no rows" never becomes "no impact".
- **The report must match the coverage declaration** (the plan announced
  before execution — see SKILL.md). Every declared
  item has a verdict backed by evidence; every declared gap appears under
  **Not validated** with its original reason; anything the run had to do
  differently from the plan is named as a deviation. A report that silently
  drops or adds coverage relative to the declaration is itself wrong.
- **Every declared claim appears in the claims table** with its own verdict
  and an evidence pointer. A claim proven wholesale by one tier may point at
  that tier's row (keeps trivial runs terse); a claim with no evidence is
  FAIL, never silently absent. A nonfunctional claim (faster, safer, scales
  further) follows the same rule: measured evidence or an explicit
  SKIP/BLOCKED reason, never a verdict from reasoning alone.
- On FAIL or BLOCKED, end with a short **Next step** line: the exact failing
  command or missing prerequisite, and the decision the human needs to make.
- A runtime claim that ends SKIP or BLOCKED for want of environment or
  tooling carries its owner runbook (see [runtime.md](runtime.md)) — short
  form in the Next step when the overall verdict is FAIL or BLOCKED,
  otherwise as the closing lines of the Tier 3 evidence section. An
  escalated runbook for a complex blocked claim (multi-system, deployment,
  load — see runtime.md) is its own `## Runbook — <claim>` section,
  referenced from the Next step. An overall PASS does not waive either
  form.
- The banned-language list from [evidence.md](evidence.md) applies to every
  word of this report.
