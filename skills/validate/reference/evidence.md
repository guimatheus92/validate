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
  Missing environment is named, never manufactured: a fabricated value
  that makes the check run converts an honest BLOCKED into a counterfeit
  verdict, however loudly the fabrication is disclosed.
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

A filtered or categorized test run can exit green while matching nothing.
Before a filtered run, name the tests you expect it to execute; after,
confirm the runner-reported count and names match. Green with fewer
executions than expected is FAIL, not PASS — and executions are what the
runner reports having run, never the scenario/matrix/data-row definitions
countable in the source.

Wall-clock measurements are not proof of timing behavior: what the code
requested and what the clock reads back routinely disagree in both
directions (scheduling stretches a requested 10ms delay to 14ms; a coarse
clock can read it back as 6ms). Prove timing claims with logged or
calculated delays, an injected clock, or fake time — assert on what the
code decided, not on what the clock happened to read.

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
- widening a lint/typecheck ignore to silence the finding;
- fabricating environment a check is missing — an env var value,
  credential, URL, or stubbed endpoint — so it will run, disclosed or
  not: a check whose environment is missing is BLOCKED with the missing
  piece named, not an invitation to invent it.

## Regression proof

"All tests pass" is compatible with the change proving nothing — maybe no
test covers the change at all, or the covering test would pass regardless.
Tier 2 cannot be PASS until the causal link is proven in the mode the
change calls for. A missing or failed proof caps the tier: Tier 2 is
**FAIL**, with the reason stated (covering test does not detect the bug /
new test survived tampering / new test passes at its historical
predecessor), no matter how green the suite is.

Mode selection follows the claim, not the observed state. Work presented
as a bug fix — or that modifies the covered source — always takes the
bug-fix proof: when the behavior looks already present at base, that is
exactly what the pre-fix run exposes. The tamper check is for pure test
additions — the session added or modified tests and claims no behavioral
change. New-feature tests follow the feature rule.

In any of these procedures, on a stack with a build step, force a fresh
build (or verify the output artifact actually changed) after altering or
restoring source and before the decisive rerun. Stale build outputs
counterfeit proofs in both directions: copied files can carry old
timestamps, and an incremental build may quietly reuse the previous
binary — a fail or a pass measured against the wrong binary is not
evidence.

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
on both sides. Prove the test can fail, preferring the repo's real history
over a synthetic break.

**First, look for an honest historical boundary.** Search history for the
commit that made the covered behavior true — usually a fix; the
introduction only when the behavior was born correct. `git log -S` finds
occurrence-count changes (introductions and removals), not body-only
fixes, so read the body history too: `git log -p -- <file>`,
`git log -G'<pattern>'`, `git blame` on the covered lines. If such a
commit exists, replay against it:

1. Run the new test on the intact tree. It must **pass**.
2. Create a throwaway worktree at that commit's predecessor
   (`git worktree add <tmp-dir> <commit>^`), copy the new test in, and run
   it there. It must **fail its assertion** on a tree that still builds —
   the failing state is one that really shipped, not one you manufactured.
3. Both captures go in the report; remove the worktree
   (`git worktree remove <tmp-dir> --force`). Note in passing whether that
   historical commit shipped a test for this exact input — a neighboring
   generic test is not the same guard, and the gap is worth a line in the
   report.

**Fall back to the tamper check** when history offers no honest boundary —
the behavior has been in the repo since its first commit, or at the
predecessor the test would fail for the wrong reason (the symbol is
absent, the tree cannot build): a run that dies before reaching the
assertion proves nothing, so replay there is worthless and the tamper
check is the proof. A replay you could not attempt never fails the tier; a
proof missing in **both** forms does.

1. Create a throwaway worktree of the current branch
   (`git worktree add <tmp-dir> HEAD`), and make sure the new test is
   present in it — copy the test file in if it is not yet committed
   (`git worktree add` carries only committed state).
2. In the worktree, deliberately break the covered code path — alter its
   behavior (flip a comparison, change a returned value), never its syntax:
   a tree that cannot build fails every test and proves nothing about this
   one.
3. Run the new test there. It must **fail** — and one or two unrelated
   tests, run alongside as controls, must stay **green**: a focused failure
   implicates the tampered path; a tree where everything fails proves
   breakage, not the guard. When the repo offers no unrelated test to
   serve as a control, say so and show focus another way: the failure must
   be the test's own assertion (expected/actual quoted), never a load or
   build error. Run the new test on the intact tree. It must **pass**.
4. Both captures go in the report; remove the worktree
   (`git worktree remove <tmp-dir> --force`).

A new test that survives tampering is vacuous — it guards nothing — and
Tier 2 is FAIL with that reason. When neither form of the proof is
feasible (the test depends on an external service or environment a
worktree cannot have), mark the tamper check SKIP with the reason stated —
never silently. A SKIP'd proof caps the tier at SKIP — never PASS: a
green suite cannot stand in for the proof it was exempted from.

### New feature — prove the test exercises it

Behavior that did not exist at base has no pre-state to replay against —
the baseline half of the proof is waived, and the feature's runtime proof
lives in Tier 3. The can-fail half is **not** waived: a green branch says
nothing about whether the new test would notice the feature breaking.
Prove it with the tamper check above — break the feature's behavior in a
throwaway worktree; the new test must **fail** there (unrelated controls
green) and **pass** intact, both captures side by side in the report. A
feature test that survives tampering guards nothing: Tier 2 is FAIL with
that reason, and the remedy is a stronger test (it counts against the
retry ceiling), never a softened verdict.
