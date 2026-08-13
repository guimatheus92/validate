// Consistency check for the prompt-only plugin: manifests in lockstep,
// required frontmatter present, no dangling reference links, the
// banned-language list identical between its source of truth (evidence.md)
// and the eval assertions graded against it, the eval roster coherent
// (contiguous ids, no orphan fixtures, README table complete), the
// deployed-evidence phase acknowledged on every carrier, the three SKIP
// labels canonical everywhere they appear, and the fixture telemetry data
// holding its semantic pins. This is the whole test suite — there is no
// compiled code to test.
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

// 7. Deployed-evidence carrier sentinel: the post-tier deployed-evidence
//    phase lives (compressed) on every carrier that can run or describe a
//    validation. A carrier edit that drops the phase regresses silently —
//    evals only catch it when a run happens to load that carrier. The
//    sentinel is the phrase "deployed evidence" (any case, hyphen or space).
{
  const carriers = [
    'skills/validate/SKILL.md',
    'commands/validate.md',
    '.github/prompts/validate.prompt.md',
    'skills/validate/reference/report.md',
    'AGENTS.md',
    '.claude/skills/validate-dev/SKILL.md',
  ];
  for (const file of carriers) {
    const text = readText(file);
    if (text !== null && !/deployed[ -]evidence/i.test(text)) {
      fail(`${file}: no mention of the deployed-evidence phase (expected the phrase "deployed evidence", any case, hyphen or space)`);
    }
  }
}

// 8. SKIP-taxonomy lockstep: evidence.md is the source of truth for the
//    three SKIP labels, and they are load-bearing verbatim strings — evals
//    grade reports against them. Any `SKIP (...)` written in evals.json or
//    a carrier must be one of the canonical three; a paraphrase
//    ("SKIP (waived by user)") would make the graded report and the skill
//    disagree about the same verdict.
{
  const labels = ['SKIP (not applicable)', 'SKIP (infeasible)', 'SKIP (user-waived)'];
  const evidenceText = readText('skills/validate/reference/evidence.md') ?? '';
  for (const label of labels) {
    if (!evidenceText.includes(label)) {
      fail(`skills/validate/reference/evidence.md: taxonomy label "${label}" missing — evidence.md is the source of truth for the three SKIP labels`);
    }
  }
  const scanned = [
    'evals/evals.json',
    'skills/validate/SKILL.md',
    'skills/validate/reference/evidence.md',
    'skills/validate/reference/report.md',
    'skills/validate/reference/runtime.md',
    'skills/validate/reference/deployed-evidence.md',
    'commands/validate.md',
    '.github/prompts/validate.prompt.md',
  ];
  for (const file of scanned) {
    const text = readText(file) ?? '';
    for (const m of text.matchAll(/SKIP \([^)]*\)/g)) {
      if (!labels.includes(m[0])) {
        fail(`${file}: non-canonical SKIP label ${JSON.stringify(m[0])} — must be one of: ${labels.join(' | ')}`);
      }
    }
  }
}

// 9. Fixture data integrity: the telemetry JSONL files are the load-bearing
//    artifacts of the deployed-evidence evals — every line must parse with
//    the expected columns, and each fixture's semantic pins must hold (zero
//    target rows IS the deployed-zero-rows scenario; the version flip IS
//    the post-deploy-effect scenario). A well-meaning edit to the data
//    flips the evals' meaning without failing fixture setup — this catches
//    it. Extraction couples to the literal `'telemetry/ops.jsonl': ` key
//    and its backtick literal inside each fixture's repo(...) block.
{
  const setup = readText('evals/setup-fixtures.mjs') ?? '';
  const columns = ['ts', 'operation', 'transport', 'description', 'duration_ms', 'activity_id', 'request_id', 'parent_id', 'version', 'client'];
  const fixtureRows = (fixture) => {
    const start = setup.indexOf(`'${fixture}',`);
    if (start === -1) { fail(`evals/setup-fixtures.mjs: fixture "${fixture}" not found for JSONL extraction`); return null; }
    const chunk = setup.slice(start, setup.indexOf('\nrepo(', start) === -1 ? undefined : setup.indexOf('\nrepo(', start));
    const jsonl = chunk.match(/'telemetry\/ops\.jsonl': `([^`]*)`/)?.[1];
    if (!jsonl) { fail(`evals/setup-fixtures.mjs (${fixture}): could not extract the telemetry/ops.jsonl template literal — key renamed or content moved`); return null; }
    const rows = [];
    jsonl.split('\n').filter((l) => l.trim()).forEach((line, i) => {
      try {
        const row = JSON.parse(line);
        for (const key of columns) {
          if (!(key in row)) fail(`${fixture} ops.jsonl line ${i + 1}: missing column "${key}"`);
        }
        rows.push(row);
      } catch (e) {
        fail(`${fixture} ops.jsonl line ${i + 1}: invalid JSON — ${e.message}`);
      }
    });
    return rows;
  };

  const zeroRows = fixtureRows('deployed-zero-rows');
  if (zeroRows) {
    const target = zeroRows.filter((r) => r.operation === 'ExportReport').length;
    const siblings = zeroRows.length - target;
    const hidden400 = zeroRows.filter((r) => r.transport === 'Success' && /\b400\b/.test(r.description ?? '')).length;
    if (target !== 0) fail(`deployed-zero-rows ops.jsonl: expected ZERO ExportReport rows (the zero-rows scenario), found ${target}`);
    if (siblings < 10) fail(`deployed-zero-rows ops.jsonl: expected at least 10 sibling rows as positive controls, found ${siblings}`);
    if (hidden400 < 2) fail(`deployed-zero-rows ops.jsonl: expected at least 2 protocol-400-under-transport-Success rows, found ${hidden400}`);
  }

  const incidenceRows = fixtureRows('deployed-incidence');
  if (incidenceRows) {
    const target = incidenceRows.filter((r) => r.operation === 'SendDigest');
    if (target.length === 0) fail('deployed-incidence ops.jsonl: expected SendDigest target rows, found none');
    if (!incidenceRows.some((r) => r.origin === '')) fail('deployed-incidence ops.jsonl: expected at least one unknown-origin row (origin \"\")');
    if (!incidenceRows.some((r) => r.transport === 'Failure' && r.parent_id)) {
      fail('deployed-incidence ops.jsonl: expected at least one failing child row (transport Failure with a parent_id) for the hierarchy eval');
    }
    if (incidenceRows.some((r) => r.operation === 'SendDigest' && r.transport === 'Failure' && r.origin !== '')) {
      fail('deployed-incidence ops.jsonl: the failing SendDigest rows must carry blank origin (unknown provenance) — the impact-separation scenario depends on it');
    }
    const failingActivities = new Set(incidenceRows.filter((r) => r.operation === 'SendDigest' && r.transport === 'Failure').map((r) => r.activity_id));
    if (incidenceRows.some((r) => failingActivities.has(r.activity_id) && r.origin !== '')) {
      fail('deployed-incidence ops.jsonl: EVERY row in a failing SendDigest activity must carry blank origin — a customer-origin parent or sibling gives provenance back via a correlation join');
    }
    if (incidenceRows.some((r) => r.version === '2.2.0')) fail('deployed-incidence ops.jsonl: the fixed 2.2.0 must not appear in the rows (the version-gate scenario)');
  }

  const effectRows = fixtureRows('post-deploy-effect');
  if (effectRows) {
    const deployAt = '2026-08-04T00:00:00Z';
    const before = effectRows.filter((r) => r.ts < deployAt);
    const after = effectRows.filter((r) => r.ts >= deployAt);
    if (before.length === 0 || after.length === 0) fail('post-deploy-effect ops.jsonl: expected rows on both sides of the 2026-08-04 deploy timestamp');
    if (before.some((r) => r.version !== '3.0.2')) fail('post-deploy-effect ops.jsonl: rows before the deploy timestamp must all be version 3.0.2');
    if (after.some((r) => r.version !== '3.1.0')) fail('post-deploy-effect ops.jsonl: rows at/after the deploy timestamp must all be version 3.1.0');
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
