// Consistency check for the prompt-only plugin: manifests in lockstep,
// required frontmatter present, no dangling reference links. This is the
// whole test suite — there is no compiled code to test.
//
// Usage: node scripts/check.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

let failures = 0;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failures++; };

// 1. Manifests parse, versions match, root/claude plugin.json identical.
const rootPlugin = readFileSync('plugin.json', 'utf8');
const claudePlugin = readFileSync('.claude-plugin/plugin.json', 'utf8');
if (rootPlugin !== claudePlugin) fail('plugin.json and .claude-plugin/plugin.json differ — they must be byte-identical');

const manifests = {
  'plugin.json': JSON.parse(rootPlugin),
  '.claude-plugin/plugin.json': JSON.parse(claudePlugin),
  '.claude-plugin/marketplace.json': JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8')),
};
const versions = new Set([
  manifests['plugin.json'].version,
  manifests['.claude-plugin/plugin.json'].version,
  manifests['.claude-plugin/marketplace.json'].version,
  ...manifests['.claude-plugin/marketplace.json'].plugins.map((p) => p.version),
]);
if (versions.size !== 1) fail(`version mismatch across manifests: ${[...versions].join(', ')}`);

// 2. Frontmatter: commands need description; skills need name + description.
const frontmatter = (file) => {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
};
for (const cmd of readdirSync('commands').filter((f) => f.endsWith('.md'))) {
  const fm = frontmatter(join('commands', cmd));
  if (!fm || !/^description:/m.test(fm)) fail(`commands/${cmd}: missing frontmatter description`);
}
for (const skill of readdirSync('skills')) {
  const skillFile = join('skills', skill, 'SKILL.md');
  if (!existsSync(skillFile)) { fail(`skills/${skill}/ has no SKILL.md`); continue; }
  const fm = frontmatter(skillFile);
  if (!fm || !/^name:/m.test(fm) || !/^description:/m.test(fm)) fail(`${skillFile}: frontmatter must have name and description`);

  // 3. Every reference/*.md linked from SKILL.md exists, and every file in
  //    reference/ is linked (no orphans shipping unnoticed).
  const body = readFileSync(skillFile, 'utf8');
  const linked = [...body.matchAll(/\((reference\/[\w-]+\.md)\)/g)].map((m) => m[1]);
  for (const link of linked) {
    if (!existsSync(join(dirname(skillFile), link))) fail(`${skillFile}: dangling link ${link}`);
  }
  const refDir = join('skills', skill, 'reference');
  if (existsSync(refDir)) {
    for (const ref of readdirSync(refDir).filter((f) => f.endsWith('.md'))) {
      if (!linked.includes(`reference/${ref}`)) fail(`${refDir}/${ref} exists but is not linked from SKILL.md`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
