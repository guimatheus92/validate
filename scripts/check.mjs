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

// 7. Carrier sentinels: each compressed rule lives on every carrier that
//    can run or describe a validation. A carrier edit that drops a rule
//    regresses silently — evals only catch it when a run happens to load
//    that carrier. One shared carrier list for every sentinel: the
//    caller-first rule is a sub-rule of the deployed-evidence phase, so
//    the parent's tripwire coverage must never be narrower than the
//    child's. Sentinels: the phrase "deployed evidence" (any case, hyphen
//    or space) and the caller-first rule ("caller first" / "caller-first"
//    / "caller reachability").
{
  const carriers = [
    'skills/validate/SKILL.md',
    'commands/validate.md',
    '.github/prompts/validate.prompt.md',
    'skills/validate/reference/report.md',
    'AGENTS.md',
    '.claude/skills/validate-dev/SKILL.md',
    'skills/validate/reference/deployed-evidence.md',
    'skills/validate/reference/recipe.md',
    'skills/validate/reference/runtime.md',
    'README.md',
    'CHANGELOG.md',
  ];
  const sentinels = [
    { label: 'deployed-evidence phase', re: /deployed[ -]evidence/i },
    { label: 'caller-first rule', re: /caller[ -](first|reachability)/i },
  ];
  for (const { label, re } of sentinels) {
    for (const file of carriers) {
      const text = readText(file);
      if (text !== null && !re.test(text)) {
        fail(`${file}: no mention of the ${label} (expected a match for ${re})`);
      }
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
//    the post-deploy-effect scenario; zero caller target rows IS the
//    caller-route-not-used scenario). A well-meaning edit to the data
//    flips the evals' meaning without failing fixture setup — this catches
//    it. Extraction couples to the literal `'telemetry/ops.jsonl': ` and
//    `'telemetry/outgoing.jsonl': ` keys and their backtick literals
//    inside each fixture's repo(...) block.
{
  const setup = readText('evals/setup-fixtures.mjs') ?? '';
  const columns = ['ts', 'operation', 'transport', 'description', 'duration_ms', 'activity_id', 'request_id', 'parent_id', 'version', 'client'];
  const outgoingColumns = ['ts', 'role', 'version', 'method', 'route', 'status', 'activity_id', 'env', 'region', 'client'];
  // The file→columns mapping is fixed (ops rows always carry the ops
  // columns, outgoing rows the outgoing ones) — derived here so call
  // sites cannot pass a mismatched pair.
  const fixtureRows = (fixture, file = 'telemetry/ops.jsonl') => {
    const cols = file.endsWith('outgoing.jsonl') ? outgoingColumns : columns;
    const start = setup.indexOf(`'${fixture}',`);
    if (start === -1) { fail(`evals/setup-fixtures.mjs: fixture "${fixture}" not found for JSONL extraction`); return null; }
    const chunk = setup.slice(start, setup.indexOf('\nrepo(', start) === -1 ? undefined : setup.indexOf('\nrepo(', start));
    const marker = `'${file}': \``;
    const litStart = chunk.indexOf(marker);
    const litEnd = litStart === -1 ? -1 : chunk.indexOf('`', litStart + marker.length);
    const jsonl = litEnd === -1 ? null : chunk.slice(litStart + marker.length, litEnd);
    if (!jsonl) { fail(`evals/setup-fixtures.mjs (${fixture}): could not extract the ${file} template literal — key renamed or content moved`); return null; }
    const rows = [];
    jsonl.split('\n').filter((l) => l.trim()).forEach((line, i) => {
      try {
        const row = JSON.parse(line);
        for (const key of cols) {
          if (!(key in row)) fail(`${fixture} ${file} line ${i + 1}: missing column "${key}"`);
        }
        rows.push(row);
      } catch (e) {
        fail(`${fixture} ${file} line ${i + 1}: invalid JSON — ${e.message}`);
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

  // caller-route-not-used: zero caller target rows IS the scenario; every
  // service target row must stay test-marked or it becomes countable
  // deployed traffic and evals 32/33 change meaning.
  const crnOps = fixtureRows('caller-route-not-used');
  const crnOut = fixtureRows('caller-route-not-used', 'telemetry/outgoing.jsonl');
  if (crnOps) {
    const target = crnOps.filter((r) => r.operation === 'SearchArchive');
    if (target.length < 2) fail(`caller-route-not-used ops.jsonl: expected at least 2 test-host SearchArchive rows, found ${target.length}`);
    if (target.some((r) => !/-test\./.test(r.version) || r.client !== '')) {
      fail('caller-route-not-used ops.jsonl: every SearchArchive row must be test-marked (-test. version AND blank client) — one customer-countable target row breaks the caller-first scenario');
    }
  }
  if (crnOut) {
    if (crnOut.some((r) => r.route === '/invoices/archive')) fail('caller-route-not-used outgoing.jsonl: expected ZERO /invoices/archive rows (the caller-not-used scenario)');
    const siblings = crnOut.filter((r) => r.route === '/invoices' || r.route === '/invoices/{id}').length;
    if (siblings < 8) fail(`caller-route-not-used outgoing.jsonl: expected at least 8 sibling-route rows proving the caller live, found ${siblings}`);
  }

  // test-telemetry-in-production-table: env=PROD test rows must stay fully
  // marked (all three markers), and the customer failure count is pinned at
  // exactly 1 — eval 34 quotes it.
  const ttOps = fixtureRows('test-telemetry-in-production-table');
  const ttOut = fixtureRows('test-telemetry-in-production-table', 'telemetry/outgoing.jsonl');
  if (ttOps) {
    const redeem = ttOps.filter((r) => r.operation === 'RedeemCode');
    const isTest = (r) => /-test\./.test(r.version) || /^(test|ci)-/.test(r.role_instance ?? '') || (r.source_path ?? '') !== '';
    const testRows = redeem.filter(isTest);
    const genuine = redeem.filter((r) => !isTest(r));
    const is400 = (r) => r.transport === 'Success' && /\b400\b/.test(r.description ?? '');
    if (testRows.length !== 3 || !testRows.every((r) => r.env === 'PROD')) fail('test-telemetry-in-production-table ops.jsonl: expected EXACTLY 3 test-marked RedeemCode rows, all env PROD — eval 34 quotes the 3-test/4-genuine split');
    if (testRows.some((r) => !(/-test\./.test(r.version) && /^test-/.test(r.role_instance ?? '') && (r.source_path ?? '') !== ''))) {
      fail('test-telemetry-in-production-table ops.jsonl: every test RedeemCode row must carry ALL THREE markers (-test. version, test- role_instance, non-empty source_path) — a half-marked row makes classification ambiguous');
    }
    if (genuine.length !== 4) fail('test-telemetry-in-production-table ops.jsonl: expected EXACTLY 4 genuine customer RedeemCode rows — eval 34 quotes the 3-test/4-genuine split');
    if (testRows.filter(is400).length !== 2) fail('test-telemetry-in-production-table ops.jsonl: expected EXACTLY 2 failing (400-under-Success) test rows — eval 34 pins the excluded test-failure count at 2');
    if (genuine.filter(is400).length !== 1) fail('test-telemetry-in-production-table ops.jsonl: expected EXACTLY 1 genuine failing row — eval 34 pins the customer-impact count at 1');
    if (ttOut) {
      const testActs = new Set(testRows.map((r) => r.activity_id));
      if (ttOut.some((r) => testActs.has(r.activity_id))) fail('test-telemetry-in-production-table: a test-marked ops row shares an activity_id with a caller row — test rows must never gain caller corroboration');
      if (!genuine.every((g) => ttOut.some((o) => o.activity_id === g.activity_id && o.route === '/codes/redeem'))) {
        fail('test-telemetry-in-production-table: every genuine RedeemCode row must share its activity_id with a /codes/redeem caller row — caller corroboration is what separates genuine from test');
      }
    }
  }

  // caller-service-disagreement: service target rows must exist, the caller
  // file must be live-but-silent for the target route, and no target row may
  // carry the exported caller's client string — corroboration would dissolve
  // the disagreement eval 35 grades.
  const csOps = fixtureRows('caller-service-disagreement');
  const csOut = fixtureRows('caller-service-disagreement', 'telemetry/outgoing.jsonl');
  if (csOps) {
    const target = csOps.filter((r) => r.operation === 'SummarizeEvents');
    if (target.length < 3) fail(`caller-service-disagreement ops.jsonl: expected at least 3 SummarizeEvents rows, found ${target.length}`);
    if (target.some((r) => (r.client ?? '').startsWith('console-web'))) fail('caller-service-disagreement ops.jsonl: no SummarizeEvents row may carry the exported caller\'s client (console-web) — corroboration would resolve the disagreement');
    if (!target.some((r) => (r.client ?? '').startsWith('svc-gateway'))) {
      fail('caller-service-disagreement ops.jsonl: expected at least one SummarizeEvents row carrying the uncorroborated svc-gateway client — that client is the "another caller or instrumentation gap" open question eval 35 grades');
    }
    if (csOut && csOut.some((r) => (r.client ?? '').startsWith('svc-gateway'))) {
      fail('caller-service-disagreement outgoing.jsonl: the svc-gateway client must appear in NO outgoing row — caller corroboration would dissolve the open question');
    }
    const testMarked = target.filter((r) => (r.client ?? '') === '' && /^(test|ci)-/.test(r.role_instance ?? ''));
    if (testMarked.length !== 1) {
      fail(`caller-service-disagreement ops.jsonl: expected EXACTLY 1 test-marked SummarizeEvents row (blank client + ci-/test- role_instance), found ${testMarked.length} — eval 35 grades one TEST row with the rest staying UNKNOWN`);
    }
  }
  if (csOut) {
    if (csOut.some((r) => r.route === '/events/summary')) fail('caller-service-disagreement outgoing.jsonl: expected ZERO /events/summary rows (the disagreement scenario)');
    if (csOut.filter((r) => r.route === '/events').length < 3) fail('caller-service-disagreement outgoing.jsonl: expected at least 3 /events sibling rows proving the caller live');
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
