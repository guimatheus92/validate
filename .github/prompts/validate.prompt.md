---
mode: agent
description: Prove the session's work is correct — static checks, tests, and live runtime evidence — before calling it done.
---

Validate the recent work in this repository. You may not declare it correct —
only evidence may. If this repo is a checkout of the `validate` plugin's
source or ships its skill, read `skills/validate/SKILL.md` and follow it;
otherwise apply this compressed contract:

1. **Scope**: the full range of the session's work — all its commits plus
   uncommitted changes (never just `HEAD~1`) — unless the user gave an
   explicit range or paths.
2. **Declare coverage first**: before executing, enumerate the session's
   claims (from the request, commit messages, and diff — one line each, with
   the tier that will prove it), state what you WILL validate (per tier) and
   what you canNOT validate with the reason (no tooling, no credentials, not
   locally executable — check what parses or dry-runs, declare the rest),
   and name the nonfunctional dimensions (security, performance, scale,
   compatibility, reliability, deployment) no claim covers. The final report
   must match this declaration, claim by claim.
3. **Tier 1 — static**: typecheck, lint, build, using the project's own
   scripts/Makefile/CI definitions. Absent = SKIP with reason. On every
   stack, also run diff hygiene: `git diff --check`, leftover conflict
   markers, unexpected or generated files flagged against the stated task,
   every changed file expected or flagged.
4. **Tier 2 — tests**: run the relevant suites. For a bug fix, prove the
   regression: the covering test must fail on the pre-fix code (throwaway
   `git worktree` at base) and pass on the fixed tree — capture both. For
   any other test the session added — over pre-existing behavior or a new
   feature — prove it can fail: first search history for the commit that
   introduced or fixed the behavior and replay (the new test fails at that
   commit's predecessor, passes intact); no such boundary → tamper-check:
   break the covered code's behavior in a throwaway worktree of HEAD; the
   new test must fail there while unrelated control tests stay green, and
   pass intact (SKIP with stated reason only when infeasible). Filtered
   runs count only via runner-reported executions — a filter matching zero
   tests exits green and proves nothing. Missing or failed proof = Tier 2
   FAIL, however green the suite.
5. **Tier 3 — runtime**: run the real thing and observe the changed flow.
   CLI → run it and capture output; API → send real requests; web UI → drive
   a browser if tooling exists, else assert on served HTML and mark purely
   visual claims SKIP, never PASS.
6. **Verdicts**: PASS / FAIL / BLOCKED / SKIP per tier, overall verdict
   first. Evidence = output, exit codes, response bodies, screenshots
   captured THIS run; memory is not evidence; ambiguous output = FAIL.
   BLOCKED names exactly what is missing — and never invents it: no
   fabricated env values, credentials, or stubs to force a check to run.
7. **Honesty**: never weaken a check to pass it. At most 3 fix-and-rerun
   attempts, then stop and report FAIL. Banned in your conclusions: "should
   work", "probably", "seems to", "appears to", "likely", "I believe", …
   (canonical list: `skills/validate/reference/evidence.md`).

Report: overall verdict, per-tier table (Tier | Verdict | What ran |
Evidence), a claims table (Claim | Verdict | Evidence — one row per declared
claim), a "Not validated" line matching the declared gaps and naming the
nonfunctional dimensions no claim covered, then the evidence appendix with
captures quoted.
