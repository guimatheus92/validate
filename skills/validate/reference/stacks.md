# Stacks — detection and Tier 1/2 playbooks

## Detection

Identify each stack in scope from marker files at (or nearest above) the
changed files:

| Marker | Stack |
|---|---|
| `package.json` (+ `tsconfig.json`) | JavaScript / TypeScript |
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python |
| `*.sln`, `*.csproj` | C# / .NET |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml`, `build.gradle(.kts)` | JVM |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `mix.exs` | Elixir |

## The project's own entry points beat raw tools

Before reaching for `tsc` or `pytest` directly, look for what the project
itself defines — those encode flags, env vars, and config paths you would
otherwise guess wrong:

1. `package.json` `scripts` (`build`, `lint`, `typecheck`, `test`, `e2e`)
2. `Makefile` / `justfile` / `taskfile` targets
3. `tox.ini` / `noxfile.py` sessions
4. **CI workflows** (`.github/workflows/*.yml`, `azure-pipelines.yml`) — the
   project's executable definition of "what must pass". If CI runs
   `npm run test:ci`, that is the Tier 2 command, not `npm test`.
5. A `validate-recipe` skill or project README "development" section.

## Tier 1 — static, per stack

Run what exists; anything the project genuinely doesn't have is SKIP with the
reason stated ("no linter configured"), never silently omitted.

| Stack | Typecheck | Lint | Build |
|---|---|---|---|
| JS/TS | `tsc --noEmit` (if tsconfig) | eslint/biome via project script | project `build` script |
| Python | `mypy`/`pyright` (if configured) | `ruff check` / flake8 (if configured) | — (or package build if it's a lib) |
| C#/.NET | — (build covers it) | `dotnet format --verify-no-changes` (if used) | `dotnet build` |
| Rust | — (build covers it) | `cargo clippy` | `cargo build` |
| Go | `go vet` | golangci-lint (if configured) | `go build ./...` |
| JVM | — (build covers it) | checkstyle/ktlint (if configured) | `mvn -q compile` / `gradle build -x test` |
| Ruby | `srb tc` (if Sorbet configured) | `rubocop` (if configured) | — (or `rails zeitwerk:check` on Rails) |
| PHP | `phpstan analyse` / `psalm` (if configured) | `php -l` on changed files; `phpcs` (if configured) | `composer validate` (if it's a package) |
| Elixir | `mix compile --warnings-as-errors` | `mix format --check-formatted`; credo (if configured) | — (compile covers it) |

## Tier 2 — tests, per stack

| Stack | Runner discovery | Run one file |
|---|---|---|
| JS/TS | `test` script → jest/vitest/mocha/node:test | `npx vitest run <file>` / `npx jest <file>` |
| Python | pytest (default), unittest | `pytest <file> -x -q` |
| C#/.NET | `dotnet test` | `dotnet test --filter <name>` |
| Rust | `cargo test` | `cargo test <name>` |
| Go | `go test ./...` | `go test ./<pkg> -run <name>` |
| JVM | `mvn test` / `gradle test` | `--tests <class>` |
| Ruby | `bundle exec rspec` / `rails test` / minitest | `bundle exec rspec <file>` / `rails test <file>` |
| PHP | `vendor/bin/phpunit` / `vendor/bin/pest` | `vendor/bin/phpunit <file>` |
| Elixir | `mix test` | `mix test <file>` |

Run the full relevant suite once (scoped to the affected package in a
monorepo). Then, for a bug fix, run the regression-proof procedure from
[evidence.md](evidence.md) on the covering test — a full green suite does not
by itself prove the fix fixed anything.

E2E suites (Playwright, Cypress, pytest-e2e) belong to Tier 2 when they
already exist in the project: run the specs covering the changed flow, not
necessarily the whole suite (state why if you scope down).

## Unknown stack

No marker matched, or the markers matched but no commands exist:

1. Read the CI workflows and README for build/test commands — projects
   document their own truth more often than not.
2. Still nothing runnable → Tier 1 and Tier 2 are **BLOCKED** (state exactly
   what you looked for), not SKIP. Skipping says "not applicable"; this is
   "applicable but I couldn't" — the difference matters to the reader.
