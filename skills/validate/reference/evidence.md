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

The list is not exhaustive. When none of these forms fit, improvise the
capture — a diff of two outputs, a pair of responses, a generated file, a
before/after excerpt of anything observable. The evidence FORM is free;
its existence is not: improvise how you capture, never what you conclude.

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

## Regression proof

"All tests pass" is compatible with the change proving nothing — maybe no
test covers the change at all, or the covering test would pass regardless.
Tier 2 cannot be PASS until the causal link is proven in the mode the
change calls for. A missing or failed proof caps the tier: Tier 2 is
**FAIL**, with the reason stated (covering test does not detect the bug /
new test survived tampering), no matter how green the suite is.

Mode selection follows the claim, not the observed state. Work presented
as a bug fix — or that modifies the covered source — always takes the
bug-fix proof: when the behavior looks already present at base, that is
exactly what the pre-fix run exposes. The tamper check is for pure test
additions — the session added or modified tests and claims no behavioral
change. New-feature tests follow the feature rule.

### Bug fix — prove the test detects the bug

1. Identify (or write) the test that covers the fixed behavior.
2. Run it against the **pre-fix** code: create a throwaway worktree at the
   base (`git worktree add <tmp-dir> <base-commit>`), copy the test file in,
   run that one test there. It must **fail**.
3. Run the same test on the fixed tree. It must **pass**.
4. Both captures go in the report; remove the worktree
   (`git worktree remove <tmp-dir> --force`).

If the pre-fix run does not fail, the test does not detect the bug and the
fix is unproven — Tier 2 is FAIL with that reason. The remedy is a test
that does fail pre-fix (it counts against the retry ceiling), never a
softened verdict.

### Tests added for behavior that already existed — prove they can fail

When the session adds or modifies tests covering behavior that was already
present at base, the baseline comparison proves nothing — the test passes
on both sides. Prove the test is not vacuous with a **tamper check**:

1. Create a throwaway worktree of the current branch
   (`git worktree add <tmp-dir> HEAD`), and make sure the new test is
   present in it — copy the test file in if it is not yet committed
   (`git worktree add` carries only committed state).
2. In the worktree, deliberately break the covered code path — alter its
   behavior (flip a comparison, change a returned value), never its syntax:
   a tree that cannot build fails every test and proves nothing about this
   one.
3. Run the new test there. It must **fail**. Run it on the intact tree. It
   must **pass**.
4. Both captures go in the report; remove the worktree
   (`git worktree remove <tmp-dir> --force`).

A new test that survives tampering is vacuous — it guards nothing — and
Tier 2 is FAIL with that reason. When the tamper check is genuinely
infeasible (the test depends on an external service or environment a
worktree cannot have), mark it SKIP with the reason stated — never
silently. A SKIP'd tamper check caps the tier at SKIP — never PASS: a
green suite cannot stand in for the proof it was exempted from.

### New feature

Behavior that did not exist at base: a test exercising the new behavior
exists and passes. There is no pre-state to prove against and no tamper
check required — the feature's runtime proof lives in Tier 3.
