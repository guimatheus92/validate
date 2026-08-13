# Runtime — Tier 3, observing the change in the running system

Tiers 1–2 prove the code compiles and the suites are green. Tier 3 proves the
behavior: you run the real thing and watch the changed code execute. This is
the tier that catches what tests miss — wiring, config, the case nobody wrote
a test for.

## Pick the surface

Every product change ends somewhere a user (or another system) meets it.
Choose from the changed-file list, not from imagination:

| What changed | Surface | Prove it by |
|---|---|---|
| CLI entry points, arg parsing | terminal | run the real binary/script with args that exercise the change; capture stdout, stderr, exit code |
| Routes, controllers, handlers | HTTP | start the app, send real requests (`curl -i`), capture status + body |
| Components, pages, templates, styles | browser | drive the changed flow with browser tooling, screenshot the decisive moment |
| Exported library API, no executable | package boundary | scratch script importing the **public** surface (as a consumer would, not internals), run it, capture output |
| Queue/cron/worker handlers | job execution | trigger one run, capture logs/output |
| Only docs, comments, CI config, lockfiles | — | Tier 3 = SKIP, reason stated |

An internal function is not a surface — follow its callers upward until you
reach one, and drive that. When the walk finds **no caller at all** —
nothing calls, imports, routes to, or registers the changed code — that
absence is the finding (the reachability check in [scope.md](scope.md)):
say so in the report, and never present a scratch-harness run against dead
code as proof of live behavior.

Tier 3 proves behavior in a runtime you executed here. Whether the change
is live in a deployed system, and whether its failure occurs in real data,
is the deployed-evidence phase — [deployed-evidence.md](deployed-evidence.md)
when its gate applies. The caller walk above has a deployed analogue: when
the gate applies, that phase proves caller reachability — the real deployed
producer's own request telemetry — before service-side rows count as
deployed traffic.

Drive the specific flow the diff touched, with inputs that hit the changed
lines. After the happy path, probe one or two adjacent cases (an error path,
an edge input) — regressions live next door to changes.

## Launch discipline

- Start servers in the background; never block the session on a foreground
  process.
- Health-check before driving (`curl -sf localhost:<port>/health` or the
  root route, retry briefly) — driving an app that hasn't bound its port
  yields garbage evidence.
- Prefer the project's own launch command (recipe → `dev`/`start` script →
  README) over improvised invocations.
- Kill everything you started when done, success or failure. A leaked server
  breaks the user's next run.

## Web UI: the degradation ladder

Never claim visual behavior you did not see. When the change is a web UI:

1. **Browser automation MCP** available (Playwright, Chrome DevTools) →
   navigate, drive the flow, screenshot. Best evidence.
2. No MCP, but the project has Playwright/Cypress as a dependency → write a
   throwaway spec for the changed flow and run it via `npx`.
3. Neither → assert what HTTP can see: fetch the page, check the rendered
   HTML for the expected change.
4. The claim is genuinely visual (layout, styling) and rungs 1–2 are
   unavailable → that claim is **`SKIP (infeasible)`** ("no browser
   tooling available"), never PASS. Rung 3 evidence proves markup, not
   pixels.

The same principle generalizes: each surface has its best evidence, and when
you can't get it, degrade explicitly and say so — don't quietly substitute
weaker evidence and call it PASS.

## Optional: the before/after runtime capture

When the change's effect is directly observable and the baseline app can
feasibly run, a worktree at base lets you capture the "before" next to the
"after" — the gold-standard version of Tier 3 evidence. The capture takes
whatever tangible form the surface offers: a screenshot pair, two log
excerpts, two HTTP responses, two CLI outputs, a diff of generated files.
No screenshot or log available? Improvise the form — any artifact captured
this run that shows the two states side by side counts; what may never be
improvised is the artifact itself. This rung is never required, and its
absence never downgrades a verdict: running the baseline app is often
infeasible (databases, env vars, migrations), and the tiers stand on their
own without it.

## When a runtime claim ends SKIP or BLOCKED: leave a runbook

A named gap ("no browser tooling", "no staging credentials") tells the
reader what you lacked, not what to do. When a runtime claim you set out
to prove ends SKIP or BLOCKED for want of environment or tooling, put a
short runbook in the report so the owner can finish the proof: the
prerequisites (credentials, environment, data), the exact commands or flow
to run, the observation that decides pass or fail, and any cleanup. Four
to eight lines, executable by someone who was not in this session. A
`SKIP (not applicable)` that merely scopes the tier out (docs-only change)
needs no runbook — there is nothing to finish; `SKIP (infeasible)` and
BLOCKED carry one, and `SKIP (user-waived)` records the quoted waiver and
still carries the short form so the owner can finish the proof later.

**Escalate the form when the short version cannot honestly fit** — the
proof spans more than one system or service, needs a provisioned
environment (deployment, load, data migration), or has steps whose failure
needs rollback. The escalated runbook is a full plan, its own
`## Runbook — <claim>` section of the report:

1. **Prerequisites** — environment, credentials, data, access, and who
   holds them
2. **Staged execution** — ordered steps sized to limit blast radius (one
   replica, one tenant, a canary slice first), with a checkpoint
   observation after each
3. **Safety limits** — load caps, test-tenant scoping, what must never be
   touched
4. **The deciding observation** — what to capture at each stage; which
   result is PASS and which is FAIL
5. **Rollback / cleanup** — how to undo each stage if its checkpoint fails
6. **Sign-off** — who confirms the result, and where the evidence lands

Offer to also write the plan to a file in the repo — ask first, the same
rule as the recipe; if the project recipe records an evidence-directory
convention, that is where it goes.
