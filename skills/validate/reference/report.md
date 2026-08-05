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

## Evidence

### Tier 1
<command → exit code, and the lines that matter, quoted>

### Tier 2
<runner summary quoted; for a bug fix: the pre-fix FAIL capture and the
post-fix PASS capture, side by side>

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
- On FAIL or BLOCKED, end with a short **Next step** line: the exact failing
  command or missing prerequisite, and the decision the human needs to make.
- The banned-language list from [evidence.md](evidence.md) applies to every
  word of this report.
