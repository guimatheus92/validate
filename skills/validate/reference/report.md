# Report — the final output format

Print the report exactly in this shape, verbatim — no introductory prose
above it, no hedged commentary below it. The report IS the answer.

```markdown
# Validation: <one-line overall verdict — PASS | FAIL | BLOCKED>

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
| /export returns the report as JSON | PASS | Tier 3 response capture (appendix) |

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
```

Rules:

- **Overall verdict first.** The reader decides "ship or not" from line one;
  everything after is supporting detail.
- Overall is PASS only when every tier is PASS or SKIP. Any FAIL → overall
  FAIL. Any BLOCKED (and no FAIL) → overall BLOCKED.
- Every PASS row must point at evidence that exists in the appendix. A row
  that can't is not PASS — fix the verdict, not the appendix.
- SKIP and BLOCKED rows carry their reason in the "What ran" column
  ("docs-only change" / "no DATABASE_URL in env — needed to start the app").
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
