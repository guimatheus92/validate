# Contributing

Thanks for helping improve validate. This is a prompt-only plugin: a
contribution is almost always an edit to a markdown file, not code.

## Ground rules

- **No compiled code.** The plugin's value is that it installs as text and
  runs identically on Copilot CLI and Claude Code. Features that need a
  binary belong in a different tool.
- **No host-specific tool IDs in prompts.** Say "if a browser-automation MCP
  is available…" and provide an explicit degradation path.
- **Keep the router architecture.** `SKILL.md` stays small; depth goes in
  `skills/validate/reference/*.md`, one topic per file, linked from the
  reference index.

## Local checks

```bash
node scripts/check.mjs
```

This verifies the three manifests are in lockstep, frontmatter is present,
and every reference file is linked from SKILL.md (and vice versa). CI runs
the same script.

## Behavioral changes → re-run the evals

If you touch anything under `skills/`, re-run the eval scenarios — they are
the skill's regression suite:

```bash
node evals/setup-fixtures.mjs <tmp-dir>   # builds the 14 fixture repos
```

Then run each prompt from `evals/evals.json` in its fixture (on the `work`
branch, scope `main..HEAD`) with an agent that has the skill, and grade the
report against the eval's `assertions`. A change that makes an assertion
fail needs either a fix or a very good argument.

## Testing the plugin live

```
/plugin marketplace add <path-to-your-checkout>
/plugin install validate@validate
```

Then run `/validate` in any repo with a fresh change.

## Releases (maintainers)

```bash
node scripts/release.mjs <patch|minor|major|x.y.z>
```

Bumps the version across all three manifests, proves no stale version
string survived, rolls the CHANGELOG's Unreleased section, commits and tags.
Push is left to you: `git push --follow-tags`.
