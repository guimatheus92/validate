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

## Monorepos

Group the changed files by their nearest manifest (`package.json`,
`pyproject.toml`, `*.csproj`, `go.mod`, …). Each group is validated with its
own package's commands, run from that package's directory. A root-level
`turbo`/`nx`/`make` entry point that covers all affected packages is fine as
a substitute — prefer it when it exists, since it is the project's own
definition of "check everything".
