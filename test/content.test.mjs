import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lintDraft } from '../src/lint.mjs';

const root = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

const forbidden = [
  /payroll/i,
  /insufficient funds/i,
  /anthropic credits/i,
  /notion query/i,
  /slack_id/i,
  /U02TBQDUR/i,
  /cc @/i,
];

test('voice system exposes the required layers and supported surfaces', async () => {
  const system = await load('src/voice-system.json');
  assert.equal(system.id, 'thomas-public-voice');
  assert.equal(system.contract_version, '1.1.0');
  assert.deepEqual(system.precedence.slice(0, 3), [
    'truth_privacy_safety_authorization',
    'task_and_meaning_fidelity',
    'surface_contract',
  ]);
  assert.ok(system.foundations.length >= 7);
  assert.ok(system.components.length >= 8);
  assert.deepEqual(
    system.surfaces.map((surface) => surface.id).sort(),
    ['agent-handoff', 'email', 'long-form', 'neutral-public', 'professional-outreach', 'public-post', 'quick-chat', 'release-notes', 'sensitive-note', 'team-update'].sort(),
  );
});

test('every rule is test-linked and every specimen is annotated', async () => {
  const system = await load('src/voice-system.json');
  for (const item of [...system.foundations, ...system.components, ...system.surfaces]) {
    assert.ok(item.id, 'content unit needs an id');
    assert.ok(item.test_ids?.length, `${item.id} needs test_ids`);
  }
  assert.ok(system.specimens.length >= 16);
  const ids = [...system.foundations, ...system.components, ...system.surfaces, ...system.specimens, ...system.tests].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, 'all public IDs must be unique');
  for (const specimen of system.specimens) {
    assert.ok(specimen.annotation, `${specimen.id} needs annotation`);
    assert.ok(specimen.generalize?.length, `${specimen.id} needs generalize rules`);
    assert.ok(specimen.do_not_copy?.length, `${specimen.id} needs do_not_copy rules`);
    assert.equal(specimen.public_safe, true);
    assert.equal(specimen.provenance.source_class, 'synthetic');
    assert.equal(specimen.provenance.approval_status, 'approved-for-public-v1');
    assert.match(specimen.provenance.last_reviewed, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('unknown surfaces fail closed to the neutral public fallback', async () => {
  const system = await load('src/voice-system.json');
  assert.equal(system.agent_protocol.unknown_surface, 'neutral-public');
  const fallback = system.surfaces.find((surface) => surface.id === 'neutral-public');
  assert.ok(fallback);
  assert.equal(fallback.public_safe, true);
});

test('public source contains no known private-source markers', async () => {
  const raw = await readFile(new URL('src/voice-system.json', root), 'utf8');
  for (const pattern of forbidden) assert.doesNotMatch(raw, pattern);
});

test('authorship and authority are hard boundaries', async () => {
  const system = await load('src/voice-system.json');
  assert.equal(system.boundaries.generated_output, 'draft_for_review');
  assert.equal(system.boundaries.may_claim_authorship, false);
  assert.equal(system.boundaries.may_authorize_actions, false);
  assert.equal(system.boundaries.may_invent_personal_experience, false);
  assert.equal(system.boundaries.voice_resemblance_is_identity_verification, false);
});

test('evaluation suite includes deterministic, metamorphic, and adversarial cases', async () => {
  const system = await load('src/voice-system.json');
  const types = new Set(system.tests.map((entry) => entry.type));
  assert.ok(types.has('deterministic'));
  assert.ok(types.has('metamorphic'));
  assert.ok(types.has('adversarial'));
  assert.ok(system.tests.some((entry) => entry.id === 'boundary.identity-claim'));
  assert.ok(system.tests.some((entry) => entry.id === 'fidelity.surface-shift'));
  assert.ok(system.tests.some((entry) => entry.id === 'privacy.public-only'));
});

const words = (line) => line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim().split(/\s+/).filter(Boolean).length;
const links = (line) => (line.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;

// Parses a release-notes draft into its period heading, New items, and Improved and Fixed lines.
function parseReleaseNotes(text) {
  const lines = text.split('\n').map((line) => line.trim());
  const heading = lines[0];
  const body = lines.slice(1);
  const at = (label) => body.indexOf(label);
  const improvedAt = at('Improved');
  const fixedAt = at('Fixed');
  const newEnd = [improvedAt, fixedAt, body.length].filter((i) => i >= 0)[0];
  const blocks = body.slice(0, newEnd).join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const newItems = blocks.map((b) => { const [title, ...rest] = b.split('\n'); return { title, sentence: rest.join(' ') }; });
  const bullets = (from, to) => from < 0 ? [] : body.slice(from + 1, to).filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
  return { heading, newItems, improved: bullets(improvedAt, fixedAt >= 0 ? fixedAt : body.length), fixed: bullets(fixedAt, body.length) };
}

function releaseNotesViolations(text) {
  const out = [];
  const { heading, newItems, improved, fixed } = parseReleaseNotes(text);
  if (!/^(?:Week of |Month of )?[A-Z][a-z]+ (?:\d{1,2}, )?\d{4}$|^Version \d+(?:\.\d+)*$/.test(heading)) out.push('period heading');
  if (newItems.length > 3) out.push('more than 3 New items');
  for (const item of newItems) {
    const titleWords = words(item.title);
    if (titleWords < 2 || titleWords > 6) out.push(`title length: ${item.title}`);
    if (!item.sentence || words(item.sentence) > 20) out.push(`sentence length: ${item.title}`);
    if (links(`${item.title} ${item.sentence}`) !== 1) out.push(`one link per item: ${item.title}`);
  }
  for (const [name, list] of [['Improved', improved], ['Fixed', fixed]]) {
    if (list.length > 5) out.push(`more than 5 ${name} lines`);
    for (const line of list) {
      if (words(line) > 12) out.push(`${name} line length: ${line}`);
      if (links(line) !== 1) out.push(`one link per item: ${line}`);
    }
  }
  if (/!/.test(text.replace(/\[[^\]]+\]\([^)]+\)/g, ''))) out.push('exclamation mark');
  if (/\u2014/.test(text)) out.push('em dash');
  if (/(?:#|\bPR\s?|\bissue\s?)\d+/i.test(text)) out.push('PR or issue number');
  if (/\bwe\b|\bour\b|added support for/i.test(text)) out.push('first person or changelog boilerplate');
  if (/\b(?:powerful|seamless(?:ly)?|exciting|thrilled|game[- ]chang\w*)\b/i.test(text)) out.push('hype word');
  if (/bug fixes and improvements/i.test(text)) out.push('empty catch-all line');
  return out;
}

test('release notes surface has the same contract fields as every other surface', async () => {
  const system = await load('src/voice-system.json');
  const surface = system.surfaces.find((entry) => entry.id === 'release-notes');
  assert.ok(surface, 'release-notes surface missing');
  for (const key of ['id', 'name', 'job', 'defaults', 'required', 'avoid', 'recipe', 'review_when', 'test_ids']) assert.ok(surface[key], `release-notes needs ${key}`);
  assert.deepEqual(Object.keys(surface.defaults).sort(), Object.keys(system.surfaces[0].defaults).sort());
  assert.deepEqual(Object.keys(surface.recipe).sort(), Object.keys(system.surfaces[0].recipe).sort());
  assert.deepEqual(surface.test_ids, ['surface.release-notes']);
  assert.ok(system.tests.some((entry) => entry.id === 'surface.release-notes'));
});

test('release notes surface states the shape and every line rule', async () => {
  const system = await load('src/voice-system.json');
  const surface = system.surfaces.find((entry) => entry.id === 'release-notes');
  const text = JSON.stringify(surface).toLowerCase();
  for (const phrase of [
    'period heading', 'up to 3 new', '2–6 word title', 'at most 20 words', 'at most 12 words', 'at most 5', 'one link per item',
    "product's users", 'second person, present tense, active voice', "product's own words", 'true when shipped',
    'merge changes about one outcome', 'internal names', 'pr or issue numbers', 'process', 'hype', 'exclamation marks', 'em dashes', 'internal work',
  ]) assert.ok(text.includes(phrase), `release-notes surface must state: ${phrase}`);
  assert.doesNotMatch(text, /tennis|ntrp|desk pass|captain|league/);
});

test('release notes specimens: one worked example that keeps every rule and one near miss that breaks them', async () => {
  const system = await load('src/voice-system.json');
  const specs = system.specimens.filter((entry) => entry.surface === 'release-notes');
  const positives = specs.filter((entry) => entry.polarity === 'positive');
  const negatives = specs.filter((entry) => entry.polarity === 'negative');
  assert.ok(positives.length >= 1 && positives.length <= 3, 'one to three positive specimens');
  assert.equal(negatives.length, 1, 'exactly one near miss');
  for (const spec of positives) {
    assert.deepEqual(releaseNotesViolations(spec.text), [], spec.id);
    const parsed = parseReleaseNotes(spec.text);
    assert.ok(parsed.newItems.length >= 1 && parsed.improved.length >= 1 && parsed.fixed.length >= 1, `${spec.id} shows New, Improved and Fixed`);
    assert.equal(lintDraft(spec.text).passed, true, `${spec.id} passes the shared draft lint`);
    assert.doesNotMatch(spec.text, /tennis|ntrp|desk pass|captain|league/i);
  }
  for (const spec of negatives) assert.ok(releaseNotesViolations(spec.text).length >= 3, `${spec.id} should break several rules`);
});

test('release notes check catches each rule it enforces', () => {
  const good = 'Week of March 2, 2026\n\n[Shared lists](/lists)\nInvite anyone to a list and see their edits as they happen.\n\nImproved\n- [Search](/search) finds tasks by their notes.\n\nFixed\n- [Reminders](/settings) arrive at the time you set.';
  assert.deepEqual(releaseNotesViolations(good), []);
  for (const [bad, rule] of [
    [good.replace('Week of March 2, 2026', 'Changes'), 'period heading'],
    [good.replace('as they happen.', 'as they happen!'), 'exclamation mark'],
    [good.replace('as they happen.', 'as they happen \u2014 instantly.'), 'em dash'],
    [good.replace('by their notes.', 'by their notes (#412).'), 'PR or issue number'],
    [good.replace('Invite anyone', 'We let you invite anyone'), 'first person or changelog boilerplate'],
    [good.replace('Invite anyone', 'Seamlessly invite anyone'), 'hype word'],
    [good.replace('by their notes.', 'by their notes, their titles, their tags, their owners and their due dates.'), 'Improved line length'],
    [good.replace('[Search](/search) finds', 'Search finds'), 'one link per item'],
  ]) assert.ok(releaseNotesViolations(bad).some((v) => v.startsWith(rule)), `expected ${rule}`);
});
