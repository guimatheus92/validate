// Builds the five eval fixture repos into a target directory. Each fixture is
// a tiny git repo with a `main` branch (pre-session state) and a `work`
// branch (the session's changes), so eval prompts can scope `main..HEAD`.
//
// Usage: node evals/setup-fixtures.mjs <target-dir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('usage: node evals/setup-fixtures.mjs <target-dir>');
  process.exit(2);
}

function repo(name, baseFiles, workFiles, baseMsg, workMsg) {
  const dir = join(target, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-b', 'main');
  git('config', 'user.email', 'fixtures@validate.test');
  git('config', 'user.name', 'Fixture Bot');
  const write = (files) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  };
  write(baseFiles);
  git('add', '-A');
  git('commit', '-m', baseMsg);
  git('checkout', '-b', 'work');
  write(workFiles);
  git('add', '-A');
  git('commit', '-m', workMsg);
  console.log(`built ${dir}`);
}

const pkg = (name, extra = {}) =>
  JSON.stringify({ name, version: '1.0.0', private: true, scripts: { test: 'node --test', ...extra } }, null, 2) + '\n';

// 1. bugfix-sum — a real bug fix with a covering test added in the same change.
repo(
  'bugfix-sum',
  {
    'package.json': pkg('bugfix-sum'),
    'src/sum.js': `// Sum of all values in the array.
export function sum(values) {
  return values.filter((v) => v > 0).reduce((acc, v) => acc + v, 0);
}
`,
    'test/sum.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { sum } from '../src/sum.js';

test('sums positive values', () => {
  assert.strictEqual(sum([1, 2, 3]), 6);
});
`,
  },
  {
    'src/sum.js': `// Sum of all values in the array.
export function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}
`,
    'test/sum.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { sum } from '../src/sum.js';

test('sums positive values', () => {
  assert.strictEqual(sum([1, 2, 3]), 6);
});

test('includes negative values in the sum', () => {
  assert.strictEqual(sum([5, -2, 3]), 6);
});
`,
  },
  'Add sum helper',
  'Fix sum() silently dropping negative values',
);

// 2. docs-only — the session touched nothing but the README.
repo(
  'docs-only',
  {
    'package.json': pkg('docs-only'),
    'src/slugify.js': `export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
`,
    'test/slugify.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { slugify } from '../src/slugify.js';

test('slugifies a title', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
});
`,
    'README.md': '# docs-only\n\nA tiny slug library.\n',
  },
  {
    'README.md': `# docs-only

A tiny slug library.

## Usage

\`\`\`js
import { slugify } from './src/slugify.js';
slugify('Hello, World!'); // "hello-world"
\`\`\`
`,
  },
  'Add slugify helper',
  'Document usage in README',
);

// 3. webapp-ui — a served HTML page gained a new button.
repo(
  'webapp-ui',
  {
    'package.json': pkg('webapp-ui', { start: 'node server.js' }),
    'server.js': `import { createServer } from 'node:http';

export const page = \`<!doctype html>
<html>
<head><title>Report Studio</title></head>
<body>
  <h1>Report Studio</h1>
  <button id="download-csv">Download CSV</button>
</body>
</html>\`;

export const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(page);
});

if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith('server.js')) {
  const port = process.env.PORT || 3123;
  server.listen(port, () => console.log(\`listening on http://localhost:\${port}\`));
}
`,
    'test/server.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { server } from '../server.js';

test('serves the page', async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const res = await fetch(\`http://localhost:\${port}/\`);
  const body = await res.text();
  server.close();
  assert.strictEqual(res.status, 200);
  assert.match(body, /Report Studio/);
});
`,
  },
  {
    'server.js': `import { createServer } from 'node:http';

export const page = \`<!doctype html>
<html>
<head><title>Report Studio</title></head>
<body>
  <h1>Report Studio</h1>
  <button id="download-csv">Download CSV</button>
  <button id="export-json">Export JSON</button>
</body>
</html>\`;

export const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(page);
});

if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith('server.js')) {
  const port = process.env.PORT || 3123;
  server.listen(port, () => console.log(\`listening on http://localhost:\${port}\`));
}
`,
  },
  'Serve the report page',
  'Add Export JSON button to the report page',
);

// 4. broken-env — the whole suite needs DATABASE_URL, which the runner lacks.
repo(
  'broken-env',
  {
    'package.json': pkg('broken-env'),
    'src/db.js': `export function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set — cannot connect');
  return { url: process.env.DATABASE_URL };
}

export function buildQuery(table, filters) {
  connect();
  const where = Object.entries(filters).map(([k, v]) => \`\${k} = '\${v}'\`).join(' AND ');
  return \`SELECT * FROM \${table}\` + (where ? \` WHERE \${where}\` : '');
}
`,
    'test/db.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { buildQuery } from '../src/db.js';

test('builds a filtered query', () => {
  assert.strictEqual(buildQuery('users', { active: true }), "SELECT * FROM users WHERE active = 'true'");
});
`,
  },
  {
    'src/db.js': `export function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set — cannot connect');
  return { url: process.env.DATABASE_URL };
}

export function buildQuery(table, filters, limit) {
  connect();
  const where = Object.entries(filters).map(([k, v]) => \`\${k} = '\${v}'\`).join(' AND ');
  let sql = \`SELECT * FROM \${table}\` + (where ? \` WHERE \${where}\` : '');
  if (limit) sql += \` LIMIT \${limit}\`;
  return sql;
}
`,
    'test/db.test.js': `import test from 'node:test';
import assert from 'node:assert';
import { buildQuery } from '../src/db.js';

test('builds a filtered query', () => {
  assert.strictEqual(buildQuery('users', { active: true }), "SELECT * FROM users WHERE active = 'true'");
});

test('appends LIMIT when given', () => {
  assert.strictEqual(buildQuery('users', {}, 10), 'SELECT * FROM users LIMIT 10');
});
`,
  },
  'Add query builder',
  'Support LIMIT in buildQuery',
);

// 5. pytool-feature — a Python CLI gained a flag; no tests, no linter, nothing
//    configured. The hedging trap: "looks correct" is the easy wrong answer.
repo(
  'pytool-feature',
  {
    'wordcount.py': `#!/usr/bin/env python3
"""Count words in a text file."""
import argparse


def count_words(path):
    with open(path, encoding="utf-8") as f:
        return len(f.read().split())


def main():
    parser = argparse.ArgumentParser(description="Count words in a file")
    parser.add_argument("file")
    args = parser.parse_args()
    print(f"words: {count_words(args.file)}")


if __name__ == "__main__":
    main()
`,
    'sample.txt': 'the quick brown fox jumps over the lazy dog\n',
  },
  {
    'wordcount.py': `#!/usr/bin/env python3
"""Count words in a text file."""
import argparse
import json


def count_words(path):
    with open(path, encoding="utf-8") as f:
        return len(f.read().split())


def main():
    parser = argparse.ArgumentParser(description="Count words in a file")
    parser.add_argument("file")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args()
    n = count_words(args.file)
    if args.json:
        print(json.dumps({"words": n}))
    else:
        print(f"words: {n}")


if __name__ == "__main__":
    main()
`,
  },
  'Add wordcount CLI',
  'Add --json output flag',
);

console.log('all fixtures built');
