---
description: Prove the session's work is correct — static checks, tests, and live runtime evidence — before calling it done.
argument-hint: "[plan] [commit-range | branch | paths...]"
allowed-tools: ["Bash", "Read", "Glob", "Grep", "Write", "Edit"]
---

You are running a validation pass. Your job is to PROVE the recent work is
correct — not to assume it. The full methodology lives in the plugin's skill;
locate it, then follow it exactly.

## Step 1 — locate the methodology

Under Claude Code `${CLAUDE_PLUGIN_ROOT}` expands to the plugin root at load
time (with a plugin-cache search as fallback); under Copilot CLI the plugin
lives beneath `~/.copilot/installed-plugins/`:

```bash
SKILL="${CLAUDE_PLUGIN_ROOT}/skills/validate/SKILL.md"
if [ ! -f "$SKILL" ]; then
  SKILL=$(find ~/.claude/plugins/cache -name SKILL.md -path '*/validate/*/skills/validate/*' 2>/dev/null | sort -V | tail -1)
fi
if [ -z "$SKILL" ] || [ ! -f "$SKILL" ]; then
  SKILL=$(find ~/.copilot/installed-plugins -name SKILL.md -path '*/validate/skills/validate/*' 2>/dev/null | sort -V | tail -1)
fi
if [ -z "$SKILL" ] || [ ! -f "$SKILL" ]; then
  echo "validate skill not found (checked \${CLAUDE_PLUGIN_ROOT}, ~/.claude/plugins/cache, ~/.copilot/installed-plugins). Is the plugin installed?" >&2
  exit 1
fi
echo "$SKILL"
```

Read that SKILL.md. It routes to reference files in the same directory —
read the ones the run needs.

## Step 2 — load the project recipe, if one exists

Check these paths in order and read the first that exists (a previous run's
verified commands for this project):

1. `.claude/skills/validate-recipe/SKILL.md`
2. `.github/skills/validate-recipe/SKILL.md`
3. `.agents/skills/validate-recipe/SKILL.md`

## Step 3 — execute

Follow the skill end to end. `$ARGUMENTS` (if non-empty) is an explicit scope
override — a commit range, branch, or list of paths; otherwise detect the
session scope as the skill describes. Plan-only mode is selected ONLY when
the first whitespace-separated token of `$ARGUMENTS` is exactly `plan`:
consume that token (the remainder, if any, is the scope), follow the skill
through its coverage declaration and stop there — print what would and would
not be validated, execute nothing. A scope path or branch that merely
contains the word (e.g. `src/planner/`, `feature/plan-b`) is a normal scope
and gets a full validation.

## Hard rules (apply even if you read nothing else)

- Every verdict needs evidence captured THIS run: quoted output, exit codes,
  response bodies, screenshot paths. Memory is not evidence.
- Your final message may not contain hedging about the work's correctness —
  no "should work", "probably", "seems to", "appears to", "likely", … (the
  canonical list lives in the skill's reference/evidence.md). A claim
  without evidence is a FAIL.
- At most 3 fix-and-rerun attempts, then stop and report FAIL with all
  evidence for the human to decide.
