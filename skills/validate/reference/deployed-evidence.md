# Deployed evidence — is the fix live, and is the failure real?

Tiers 1–3 prove the change works where you ran it. Whether the changed path
executes in the deployed system, at what rate, on whose traffic, and on
which version is a different set of claims, and no amount of local proof
answers them. This phase runs after Tier 3, before the report, and only
when the gate below passes. It is not a fourth tier: it produces **evidence
statuses**, not verdicts, and reaches the overall verdict only through the
claims table ([report.md](report.md)).

## The applicability gate

Three-valued — decide it in Step 2, declare it in Step 3:

- **TRUE** when any trigger holds:
  - the fix targets code that predates this branch — the bug may be live;
  - the request, commits, or work item mention production, an incident,
    telemetry, monitoring, a customer, or a deployed environment;
  - the changed surface is a service route, worker, scheduled job, data
    pipeline, or deployment config with a deployed counterpart;
  - the project recipe names a deployed-evidence source;
  - the user asks whether it is happening in real data.
- **FALSE** when evidence proves an exclusion — docs-only, a local-only
  tool, new behavior that has never been deployed anywhere. Exclusions
  take precedence over incidental trigger words; name the failed
  prerequisite instead of running the phase out of reflex.
- **UNKNOWN** — you cannot tell whether the change has a deployed
  counterpart. UNKNOWN never silently becomes not-applicable: ask the
  user, and if the run must proceed without an answer, the phase is
  BLOCKED with "deployment status unknown" named.

## Finding a source

Discover before you ask, in this order: the recipe's `## Deployed
evidence` section → project skills, runbooks, and monitoring docs → tools
already available in this session (query CLIs, log access, database
clients) → the code that emits the operation names, metric names, or log
lines → dashboards or saved queries referenced in the repo.

Never invent a cluster, endpoint, database, table, operation name, or
time window. A guessed coordinate that happens to resolve produces
evidence about the wrong thing, which is worse than no evidence.

Nothing found → ask the user, offering exactly three outcomes:

1. provide the non-secret coordinates (source, dataset, environment,
   window);
2. name another source to use instead;
3. skip deployed-data validation this run — recorded as
   `SKIP (user-waived)` with their words quoted.

Never ask for passwords, tokens, or connection strings. If authentication
is missing, the user authenticates in their own terminal and tells you to
continue — or the check is BLOCKED with the auth step named.

## The dimensions

Report each applicable dimension separately — a PASS in one never implies
another:

| Dimension | Statuses | What decides it |
|---|---|---|
| Caller reachability | OBSERVED / NOT OBSERVED / BLOCKED / SKIP | did a deployed producer send the affected route/request |
| Service reachability | OBSERVED / NOT OBSERVED / BLOCKED / SKIP | did the service record the corresponding operation |
| Failure incidence | MEASURED F/N / NOT MEASURABLE | matching failures over eligible operations, both counted |
| Provenance | CUSTOMER / SYNTHETIC / TEST / MIXED / UNKNOWN / NO TARGET ROWS | who produced the rows, from a primary signal |
| Customer impact | PROVEN / UNPROVEN / NO TARGET ROWS | can failures be linked to affected users/tenants |
| Deployment state | DEPLOYED / NOT DEPLOYED / UNKNOWN | was the affected/fixed version in the environment during the window |
| Post-deployment effect | IMPROVED / UNCHANGED / REGRESSED / NOT MEASURABLE | before/after rates, only once the fixed version is deployed |

Wording is part of the evidence:

- Zero eligible target operations → the queried side's reachability NOT
  OBSERVED and incidence **`NOT MEASURABLE — 0 eligible target
  operations`** — never a 0/0 rate.
- "NOT OBSERVED in <source> over <window>" never becomes "never happens"
  or "no customer impact". The query bounds the claim.
- NO TARGET ROWS is the provenance/impact status only when NEITHER side
  holds target rows — every source actually queried returned zero, and
  any side that could not be queried is named as a gap beside it.
  Service rows without caller rows are never NO TARGET ROWS: they are a
  cross-source disagreement whose provenance must be classified before
  the rows count anywhere.
- NOT DEPLOYED requires deployment inventory positively proving the
  version absent; anything less is UNKNOWN.

## Caller first — prove the producer before trusting the service

Service-side rows show what a service recorded, not who called it. An
environment column that reads "production" proves neither a customer
nor a deployed caller — test hosts write into production-named tables.
Before service-side rows count as eligible deployed traffic, identify
the real deployed producer of the changed route and look for its own
outgoing requests.

Source discovery above finds what exists; this order decides which
discovered source type to query first — the strongest caller-side
signal at the top:

1. outgoing HTTP/client request telemetry from the producer;
2. API gateway or ingress access logs;
3. durable workflow/job telemetry;
4. client-side request metrics;
5. service operations/traces.

Caller telemetry is the first source, not a hard stop: after reading
it, still inspect the service side — for callers you did not predict,
instrumentation disagreement, and test/synthetic traffic — then compare
the two. Rows on one side without the other are a cross-source
disagreement: report it, and classify the rows' provenance before
counting them anywhere.

- **Caller-reachability evidence records**: the caller role/component
  and its version field; HTTP method and normalized route family; total
  and completed request rows; the status breakdown; distinct
  activities/resources (labeled approximate when an approximate
  distinct-count function produced them); environment/region/ring;
  first/last seen; and an explicit zero for the target route quoted
  beside known-live sibling routes.
- **Zero caller rows** → Caller reachability `NOT OBSERVED in
  <source/window>`; Failure incidence `NOT MEASURABLE — 0 eligible
  target operations`; Customer impact UNPROVEN — pending service-side
  reconciliation and provenance classification. Still inspect the
  service side: service rows without caller rows are the disagreement
  above, not evidence of eligible deployed traffic.
- **No caller-side source discovered** → the rule degrades; it never
  blocks the phase. A caller-side source the recipe or docs name but
  this session cannot reach is BLOCKED with the prerequisite named; no
  caller-side source in this environment at all is `SKIP (infeasible)`
  with the gap named ("no outgoing-request telemetry available for
  <producer>"). Either way, service-side evidence still proceeds, with
  the caller gap named beside every count it qualifies.
- **Service-only rows enter no customer denominator** until provenance
  identifies an eligible deployed caller: TEST or unresolved UNKNOWN
  rows leave Customer impact UNPROVEN and stay out of the
  eligible-customer denominator. Failure incidence over the queried
  source is still measured — the gap is named, never used to suppress
  the numbers.

## Query methodology

- **Derive identifiers from the emitting code**, never from prose: the
  string in the logging call, the metric-name constant, the route-to-name
  mapping. A proxy prefix or a facade's caller-name convention changes
  the recorded name — trace what the runtime actually writes.
- **Zero-inclusive positive controls.** Zero target rows means something
  only when sibling operations from the same source, window, and
  instrumentation return rows. Query the expected names alongside known
  neighbors and quote both counts.
- **Inspect payload fields, not only severity.** Protocol failures hide
  under transport success: an HTTP 400 can ride a row whose result column
  says Success, with the status only in a description or signature field.
  Filter on those fields too.
- **Reconstruct the hierarchy before counting.** Use the correlation
  fields (activity, request, parent-operation ids; start = timestamp
  minus duration when only end times are recorded) to find the actual
  failing operation — not a correlated sibling or its parent.
- **Base rate, always.** One row is not an incident and zero rows is not
  absence: report matching failures over eligible operations, first/last
  seen, and the environment/version split.
- **Provenance from a primary signal.** Caller role and binary version,
  deployment inventory, explicit test/synthetic markers, role instance,
  source or stack paths, known test-only hosts, deterministic test
  sequences. An environment column reading "production" is NOT such a
  signal — local and CI runs ingested into a production-named table
  classify as TEST, not customer. A blank user agent is not proof of
  synthetic traffic — unknown stays UNKNOWN, and a service row with no
  corresponding caller telemetry stays TEST or UNKNOWN until a primary
  signal resolves it.
- **Deployment state before attribution.** Confirm which version produced
  the rows before crediting or blaming the session's change; confirm the
  fixed version reached the environment before any before/after claim.
- **Cross-check lossy sources.** Sampled logs and aggregated metrics drop
  rows; when the primary source can lose data, corroborate with a second
  (raw traces, access logs, database state) or name the gap.

Generic shapes (placeholders, adapt to the tools at hand):

```
# count target vs sibling operations in a window (KQL-ish)
<table> | where ts between (<start> .. <end>)
        | where name in (<target>, <siblings...>)
        | summarize n=count(), fails=countif(desc contains "<failure>") by name
```

```sql
-- base rate over eligible operations (SQL)
SELECT name, COUNT(*) AS n,
       SUM(CASE WHEN desc LIKE '%<failure>%' THEN 1 ELSE 0 END) AS fails
FROM <table> WHERE ts >= <start> AND ts < <end> AND name IN (<names>)
GROUP BY name;
```

```
# flat files: zero-inclusive per-name counts (shell)
grep -c '"operation":"<TargetOp>"' <file>   # target
grep -c '"operation":"<SiblingOp>"' <file>  # positive control
```

## What each result does to the report

Classify each deployed item before executing it — the classification, not
the result, decides the roll-up (full rules: [report.md](report.md)):

1. **Asserted claim** — the user, commits, or work item state a deployed
   fact ("customers are hitting this"). It gets a claims-table row: zero
   target rows in a fit source = FAIL; a fit source that runs and does
   not support the assertion = FAIL; source unavailable and not waived =
   BLOCKED — and an asserted claim's FAIL or BLOCKED controls the
   overall verdict. Declaring the gap never releases an asserted claim
   to the tiers; only supplemental dimensions get that.
2. **Explicitly required check** — the user asks a question ("is this
   happening in data?"). The check is PASS when a fit source answers it
   conclusively — including a NOT OBSERVED or a measured-rate answer.
3. **Supplemental dimension** — you added it because the gate passed. Not
   a claim: blocked or not-observed, it is a declared gap under **Not
   validated** with a runbook, and a scoped overall PASS is allowed.

Never convert a required question into an asserted occurrence, and never
demote an asserted production fact to a supplemental note.

## Boundaries

- Read-only. This phase queries; it never deploys, mutates data, queues
  work, or updates incidents.
- A recipe "Never run locally" entry wins, even over coordinates the user
  provides mid-run: the claim is BLOCKED with a runbook, never executed —
  the user's remedy is editing the recipe ([recipe.md](recipe.md)).
- Plan-only mode declares applicability and candidate sources only — no
  queries, no asks, no statuses.
- This phase never substitutes for the blocked-runtime runbook: a
  deployment claim that Tier 3 left BLOCKED keeps its escalated staged
  runbook ([runtime.md](runtime.md)); deployed-evidence dimensions land
  beside it, not instead of it.
- An explicit in-prompt decision consumes the ask: a user who already
  waived or already required the check in their request is not asked
  again.
