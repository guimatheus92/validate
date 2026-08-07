// Consistency check for the prompt-only plugin: manifests in lockstep,
// required frontmatter present, no dangling reference links, the
// banned-language list identical between its source of truth (evidence.md)
// and the eval assertions graded against it, and the eval roster coherent
// (contiguous ids, no orphan fixtures, README table complete). This is the
// whole test suite — there is no compiled code to test.
//
// Usage: node scripts/check.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

let failures = 0;
const fail = (msg) => { console.error(`FAIL: ${msg}`); failures++; };

const readText = (file) => {
  if (!existsSync(file)) { fail(`${file}: missing`); return null; }
  return readFileSync(file, 'utf8');
};
const readJson = (file) => {
  const text = readText(file);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    fail(`${file}: invalid JSON — ${e.message}`);
    return null;
  }
};

// 1. Manifests parse, versions are real semver and match, root/claude
//    plugin.json byte-identical.
const rootPlugin = readText('plugin.json');
const claudePlugin = readText('.claude-plugin/plugin.json');
if (rootPlugin !== null && claudePlugin !== null && rootPlugin !== claudePlugin) {
  fail('plugin.json and .claude-plugin/plugin.json differ — they must be byte-identical');
}

const marketplace = readJson('.claude-plugin/marketplace.json');
const versionSources = [
  ['plugin.json', readJson('plugin.json')?.version],
  ['.claude-plugin/plugin.json', readJson('.claude-plugin/plugin.json')?.version],
  ['.claude-plugin/marketplace.json', marketplace?.version],
  ...(marketplace?.plugins ?? []).map((p, i) => [`.claude-plugin/marketplace.json plugins[${i}]`, p.version]),
];
for (const [where, v] of versionSources) {
  if (typeof v !== 'string' || !/^\d+\.\d+\.\d+$/.test(v)) fail(`${where}: version is missing or not x.y.z (got ${JSON.stringify(v)})`);
}
if (new Set(versionSources.map(([, v]) => v)).size !== 1) {
  fail(`version mismatch across manifests: ${versionSources.map(([w, v]) => `${w}=${v}`).join(', ')}`);
}

// 2. Frontmatter: commands need description; skills need name + description.
const frontmatter = (file) => {
  const match = readText(file)?.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
};
for (const dir of ['commands', 'skills']) {
  if (!existsSync(dir)) fail(`${dir}/ directory is missing`);
}
for (const cmd of existsSync('commands') ? readdirSync('commands').filter((f) => f.endsWith('.md')) : []) {
  const fm = frontmatter(join('commands', cmd));
  if (!fm || !/^description:/m.test(fm)) fail(`commands/${cmd}: missing frontmatter description`);
}
for (const skill of existsSync('skills') ? readdirSync('skills') : []) {
  const skillFile = join('skills', skill, 'SKILL.md');
  if (!existsSync(skillFile)) { fail(`skills/${skill}/ has no SKILL.md`); continue; }
  const fm = frontmatter(skillFile);
  if (!fm || !/^name:/m.test(fm) || !/^description:/m.test(fm)) fail(`${skillFile}: frontmatter must have name and description`);

  // 3. Every reference/*.md linked from SKILL.md exists, and every file in
  //    reference/ is linked (no orphans shipping unnoticed).
  const body = readText(skillFile) ?? '';
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

// 4. Banned-language lockstep: evidence.md is the source of truth; every
//    no-hedging eval assertion must enumerate exactly the same phrases,
//    because the eval is graded against evidence.md's list. (The copies in
//    commands/validate.md and .github/prompts/ are deliberately compressed
//    pointers, not full lists — excluded on purpose.)
const evidence = readText('skills/validate/reference/evidence.md');
const evidenceList = evidence?.match(/may not appear[\s\S]*?\*([^*]+)\*/)?.[1];
if (!evidenceList) {
  fail('skills/validate/reference/evidence.md: could not extract the banned-language list (italic block after "may not appear")');
} else {
  const canonical = evidenceList.split(',').map((s) => s.trim()).filter(Boolean).sort();
  const evals = readJson('evals/evals.json');
  const hedgeAssertions = (evals?.evals ?? [])
    .flatMap((e) => (e.assertions ?? []).map((a) => [e.name, a]))
    .filter(([, a]) => a.startsWith('no-hedging-language'));
  if (hedgeAssertions.length === 0) fail('evals/evals.json: no no-hedging-language assertions found');
  for (const [name, assertion] of hedgeAssertions) {
    const listed = assertion.match(/\(([^)]+)\)$/)?.[1]?.split(',').map((s) => s.trim()).filter(Boolean).sort();
    if (!listed) { fail(`evals/evals.json (${name}): no-hedging assertion has no parenthesized phrase list`); continue; }
    if (JSON.stringify(listed) !== JSON.stringify(canonical)) {
      fail(`evals/evals.json (${name}): banned-phrase list diverges from evidence.md\n  evidence.md: ${canonical.join(' | ')}\n  eval:        ${listed.join(' | ')}`);
    }
  }
}

// 5. Fixture-name lockstep: every eval's `fixture` must name a repo that
//    setup-fixtures.mjs actually builds — a rename/typo should fail here,
//    not as a confusing runtime setup error.
{
  const setup = readText('evals/setup-fixtures.mjs') ?? '';
  const built = new Set([...setup.matchAll(/^repo\(\s*\n?\s*'([^']+)'/gm)].map((m) => m[1]));
  const evals = readJson('evals/evals.json');
  if (built.size === 0) fail('evals/setup-fixtures.mjs: no repo(...) fixture definitions found');
  for (const e of evals?.evals ?? []) {
    if (e.fixture && !built.has(e.fixture)) {
      fail(`evals/evals.json (${e.name}): fixture "${e.fixture}" is not built by setup-fixtures.mjs (built: ${[...built].join(', ')})`);
    }
  }
}

// 6. Eval roster integrity: ids unique and contiguous from 0, every built
//    fixture referenced by at least one eval, and every eval named in the
//    evals/README.md scenario table. 0.2.0 shipped a documented-but-missing
//    eval (`plan-only-mode`) that sailed through green — this makes that
//    class of drift fail loudly instead.
{
  const evals = readJson('evals/evals.json')?.evals ?? [];
  const ids = evals.map((e) => e.id).sort((a, b) => a - b);
  if (JSON.stringify(ids) !== JSON.stringify([...ids.keys()])) {
    fail(`evals/evals.json: eval ids are not unique and contiguous from 0 (got ${ids.join(', ')})`);
  }
  const setup = readText('evals/setup-fixtures.mjs') ?? '';
  const built = [...setup.matchAll(/^repo\(\s*\n?\s*'([^']+)'/gm)].map((m) => m[1]);
  const referenced = new Set(evals.map((e) => e.fixture));
  for (const name of built) {
    if (!referenced.has(name)) fail(`evals/setup-fixtures.mjs: fixture "${name}" is built but referenced by no eval`);
  }
  const roster = readText('evals/README.md') ?? '';
  for (const e of evals) {
    if (e.name && !roster.includes(`\`${e.name}\``)) fail(`evals/README.md: eval "${e.name}" is missing from the scenario table`);
    if (typeof e.prompt !== 'string' || !e.prompt.trim()) fail(`evals/evals.json (${e.name}): missing or empty prompt`);
    if (!e.fixture) fail(`evals/evals.json (${e.name}): missing fixture`);
    if (!(e.assertions ?? []).some((a) => typeof a === 'string' && a.trim())) {
      fail(`evals/evals.json (${e.name}): has no assertions — it would grade trivially green`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
