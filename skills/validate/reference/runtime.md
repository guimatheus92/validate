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
reach one, and drive that.

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
   unavailable → that claim is **SKIP** ("no browser tooling available"),
   never PASS. Rung 3 evidence proves markup, not pixels.

The same principle generalizes: each surface has its best evidence, and when
you can't get it, degrade explicitly and say so — don't quietly substitute
weaker evidence and call it PASS.
