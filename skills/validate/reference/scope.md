# Scope — what exactly gets validated

The single most common validation mistake is scoping to the last commit. A
session's work is usually several commits plus whatever is still uncommitted;
validating `HEAD~1` alone silently ignores most of it. Establish the full
range first — everything downstream keys off the changed-file list you build
here.

## Explicit scope wins

If the user passed arguments, they are the scope — nothing else:

- A commit range (`abc123..def456`) — use it as given.
- A branch name — validate `merge-base(branch, default)..branch`.
- Paths — validate the current state of those files; still compute the git
  range for context if one exists.

## Detecting the session scope

```bash
git status --porcelain            # uncommitted work — always part of the scope
git remote show origin            # default branch (fallback: main, then master)
```

On a feature branch:

```bash
BASE=$(git merge-base HEAD origin/<default>)
git log --oneline "$BASE"..HEAD   # the session's commits
git diff "$BASE" --name-status    # committed changes  (three-dot vs base)
git diff HEAD --name-status       # uncommitted changes on top
```

On the default branch itself: use `@{upstream}..HEAD` (the unpushed range)
plus uncommitted changes. Clean tree and empty range? There is nothing
detectable to validate — ask the user what they want validated instead of
guessing.

Not a git repo: the scope is whatever the user described; ask if they
described nothing.

## The changed-file list

Merge committed and uncommitted paths into one deduplicated list with status
(added/modified/deleted). This list decides:

- which stack playbooks apply (a Python file changed → Python Tier 1/2),
- which Tier 3 surface to drive (a route file changed → API surface; a
  component changed → web UI),
- whether Tier 3 applies at all (only docs/config changed → SKIP).

Include the list in the final report — it is the reader's proof that you
validated the right thing.

## Diff hygiene — universal Tier 1 checks

The per-stack playbooks vary; these run on every stack, because they check
the diff itself, not the code:

- `git diff --check <base>` — whitespace errors and leftover conflict
  markers in the changed lines. Run it on the full scope: a marker in a
  docs or config file breaks no test and is exactly what this catches.
- **Unexpected content**: build outputs, generated artifacts nothing in the
  project produces, lockfile churn with no dependency change, editor/OS
  droppings, local config, credentials — anything in the diff the stated
  task did not require.
- **The scope gate**: walk the changed-file list — every file is either
  expected for the stated task or flagged in the report. An unexplained
  file is a finding, not a footnote.
- **Reachability**: every changed function, route, or module has at least
  one caller, consumer, route registration, or export reference in the
  repo — grep the symbol, check route tables and DI registrations. A
  changed surface nothing references is a finding, named in the report
  with the search capture — and Tier 3 must not validate it as if it were
  live ([runtime.md](runtime.md)).
- **Author self-review**: read the full diff with reviewer eyes — leftover
  debug output, commented-out code, TODOs introduced this session, dead
  branches.

A leftover conflict marker or a committed credential is a Tier 1 FAIL.
Other findings are named in the report; the reader decides their weight.

## Monorepos

Group the changed files by their nearest manifest (`package.json`,
`pyproject.toml`, `*.csproj`, `go.mod`, …). Each group is validated with its
own package's commands, run from that package's directory. A root-level
`turbo`/`nx`/`make` entry point that covers all affected packages is fine as
a substitute — prefer it when it exists, since it is the project's own
definition of "check everything".
