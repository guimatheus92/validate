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
2. **Declare coverage first**: before executing, state what you WILL
   validate (per tier) and what you canNOT validate with the reason (no
   tooling, no credentials, not locally executable — check what parses or
   dry-runs, declare the rest). The final report must match this declaration.
3. **Tier 1 — static**: typecheck, lint, build, using the project's own
   scripts/Makefile/CI definitions. Absent = SKIP with reason.
4. **Tier 2 — tests**: run the relevant suites. For a bug fix, prove the
   regression: the covering test must fail on the pre-fix code (throwaway
   `git worktree` at base) and pass on the fixed tree — capture both.
5. **Tier 3 — runtime**: run the real thing and observe the changed flow.
   CLI → run it and capture output; API → send real requests; web UI → drive
   a browser if tooling exists, else assert on served HTML and mark purely
   visual claims SKIP, never PASS.
6. **Verdicts**: PASS / FAIL / BLOCKED / SKIP per tier, overall verdict
   first. Evidence = output, exit codes, response bodies, screenshots
   captured THIS run; memory is not evidence; ambiguous output = FAIL.
   BLOCKED names exactly what is missing.
7. **Honesty**: never weaken a check to pass it. At most 3 fix-and-rerun
   attempts, then stop and report FAIL. Banned in your conclusions: "should
   work", "probably", "seems to", "appears to", "likely", "I believe", …
   (canonical list: `skills/validate/reference/evidence.md`).

Report: overall verdict, per-tier table (Tier | Verdict | What ran |
Evidence), a "Not validated" line matching the declared gaps, then the
evidence appendix with captures quoted.
