# Evidence — verdicts, proof rules, and the honesty constraints

## The four verdicts

- **PASS** — the check ran, the captured result is unambiguous, and it
  supports the claim. Nothing else earns PASS.
- **FAIL** — the check ran and contradicted the claim, **or** the output is
  ambiguous, **or** a claim has no evidence. Doubt resolves to FAIL because a
  false "it works" costs far more than a cautious "unproven".
- **BLOCKED** — the check could not run: missing tool, missing credentials,
  broken environment. Name exactly what is missing — BLOCKED with a precise
  cause is actionable; BLOCKED without one is just FAIL with extra steps.
- **SKIP** — the check does not apply to this change, with the reason stated.
  SKIP is a scoping statement, never a way to avoid an inconvenient check.

## What counts as evidence

Evidence is something captured **during this validation run**:

- the command line, its exit code, and the relevant output lines quoted;
- HTTP status + response body for API checks;
- screenshot file paths for browser checks;
- test runner summaries (counts, names of the specific tests).

Not evidence: your memory of it working earlier in the session (rerun it),
your reading of the code ("this clearly handles the case"), a file existing
on disk, or output too garbled to interpret (ambiguous = FAIL).

## Banned language

These words, applied to whether the work is correct, are unbacked claims in
disguise. They may not appear in the final report or in any completion
message: *should work, probably, seems to, appears to, likely, I believe,
presumably, in theory, ought to, must be working, looks correct*. If you feel
one coming, you are missing evidence — go capture it or change the verdict.

## The retry ceiling

At most **3 fix-and-rerun attempts across the entire run**. The ceiling
exists because unbounded self-repair loops burn the session and tend to
converge on making the check pass rather than making the code right. Attempt
4 means: stop, verdict FAIL, report every capture, hand the decision to the
human.

Fixes that don't count as fixes (each is itself a FAIL to report):

- loosening or deleting an assertion so it passes;
- skipping, quarantining, or deleting a failing test;
- widening a lint/typecheck ignore to silence the finding.

## Regression proof (bug fixes)

"All tests pass" after a bug fix is compatible with the fix doing nothing —
maybe no test covers the bug at all. Prove the causal link:

1. Identify (or write) the test that covers the fixed behavior.
2. Run it against the **pre-fix** code: create a throwaway worktree at the
   base (`git worktree add <tmp-dir> <base-commit>`), copy the test file in,
   run that one test there. It must **fail**.
3. Run the same test on the fixed tree. It must **pass**.
4. Both captures go in the report; remove the worktree
   (`git worktree remove <tmp-dir> --force`).

If the pre-fix run doesn't fail, the test doesn't cover the bug — say so;
the fix is unproven regardless of how green the suite is.

For a new feature, the rule relaxes: a test exercising the new behavior
exists and passes. No pre-state to prove against.
