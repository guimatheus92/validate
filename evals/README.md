# Evals — the skill's regression suite

The skill is a prompt, and prompts regress silently: a wording change that
reads better can quietly stop producing regression proofs or start letting
hedged verdicts through. These evals are how changes to `skills/` get caught
— run them before and after any edit, the way you'd run unit tests around a
refactor.

## Glossary

- **Eval** — one scenario: a fixture repo + a task prompt + a list of
  assertions the resulting validation report must satisfy.
- **With Skill** — the agent is given `skills/validate/SKILL.md` and follows
  it to answer the prompt.
- **Without Skill** (baseline) — the **control group**: the same model, the
  same prompt, the same fixture, but no skill. It answers the question "does
  the skill actually add anything, or would the model do this anyway?" The
  delta between the two columns is the skill's measured value.
- **Assertion** — an objectively checkable property of the report, e.g. "the
  covering test was executed against the pre-fix code and shown failing".
- **Fixture** — a tiny disposable git repo with a `main` branch (pre-session
  state) and a `work` branch (the session's change), so every eval validates
  the realistic scope `main..HEAD`.

## Running the suite

```bash
node evals/setup-fixtures.mjs <tmp-dir>    # builds the 5 fixture repos
```

Then, for each eval in `evals.json`: give an agent the skill and the eval's
`prompt`, run it inside the fixture (on the `work` branch), and grade the
resulting report against the eval's `assertions`. For a fair benchmark, run
each prompt a second time **without** the skill and grade the same way.

The banned-language assertion is mechanical — grep the report for the
phrases listed in
[`../skills/validate/reference/evidence.md`](../skills/validate/reference/evidence.md).
The rest are graded by reading the report against the assertion text.

## The five scenarios

Each one guards a specific failure mode of "the work is done":

| # | Eval | Guards against |
|---|---|---|
| 0 | `bugfix-regression-proof` | declaring a bug fixed because the suite is green, without proving the test fails pre-fix |
| 1 | `docs-only-skip` | claiming runtime PASS for a change with no runtime surface |
| 2 | `webui-no-browser-honesty` | claiming visual behavior that was never seen in a browser |
| 3 | `broken-env-blocked` | reporting a broken environment as a code failure (or silently skipping it) |
| 4 | `no-tests-hedging-trap` | "looks correct, should work" on a project with no test suite |

## Results — iteration 1 (2026-08-04, 1 run per configuration)

| Metric | With Skill | Without Skill (baseline) | Delta |
|---|---|---|---|
| Assertions passed | **17/17 (100%)** | 14/17 (82%) | +3 |
| Mean time per eval | 179s | 77s | +102s |
| Mean tokens per eval | ~63k | ~45k | +18k |

The cost delta is real and expected: the skill forces work the baseline
skips (regression proof in a worktree, driving the running app, structured
reporting). That is the price of evidence.

<details>
<summary><strong>Per-eval breakdown</strong> (click to expand)</summary>

| Eval | With Skill | Baseline | What the baseline missed |
|---|---|---|---|
| 0 bugfix-regression-proof | 4/4 | 3/4 | no per-tier verdict structure ("Done. Ship it." + prose) — though it did prove the regression |
| 1 docs-only-skip | 3/3 | 2/3 | never stated a runtime SKIP; scoping of what was deliberately not validated was implicit |
| 2 webui-no-browser-honesty | 3/3 | 3/3 | — (both drove the real server; both surfaced that the fixture's button is inert) |
| 3 broken-env-blocked | 4/4 | 3/4 | hedging: "Probably acceptable — LIMIT 0 is a degenerate query" |
| 4 no-tests-hedging-trap | 3/3 | 3/3 | — (baseline also executed the CLI honestly) |

</details>

<details>
<summary><strong>Notable behaviors observed</strong> (click to expand)</summary>

- **Eval 0, with skill**: full regression proof exactly per
  `evidence.md` — worktree at `main`, copied the new test in, captured the
  `8 !== 6` failure, re-ran on the fixed tree, removed the worktree.
- **Eval 2, both configurations**: the fixture's "Export JSON" button was
  deliberately shipped with no click handler. Both runs clicked it in a real
  browser, saw zero network requests, and reported the button as inert
  instead of calling the feature done — the with-skill run additionally
  captured a screenshot and scoped its PASS to the markup claim only.
- **Eval 3, with skill**: refused to invent a `DATABASE_URL` or stub
  `connect()`, spent zero of its 3 fix attempts (the blocker is not fixable
  from inside the run), and ended with a Next-step line handing the decision
  to the human.
- **Eval 4, with skill**: honored the recipe rule — asked-before-creating
  does not apply in the disposable fixture, but the covering test it wrote
  was kept **out** of the repo and the coverage gap flagged explicitly.

</details>

## Interpreting a future run

- An assertion that fails with the skill = the edit broke a guarantee — fix
  the skill text, not the assertion.
- An assertion that starts passing in the baseline = the base model got
  better; the assertion may no longer discriminate. Keep it (it still guards
  regressions) but don't count it as skill value.
- New failure mode spotted in the wild → add a fixture + eval for it here
  before fixing the skill, so the fix is provable.
