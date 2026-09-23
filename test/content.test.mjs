import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
  assert.equal(system.contract_version, '1.0.0');
  assert.deepEqual(system.precedence.slice(0, 3), [
    'truth_privacy_safety_authorization',
    'task_and_meaning_fidelity',
    'surface_contract',
  ]);
  assert.ok(system.foundations.length >= 7);
  assert.ok(system.components.length >= 8);
  assert.deepEqual(
    system.surfaces.map((surface) => surface.id).sort(),
    ['agent-handoff', 'email', 'long-form', 'neutral-public', 'professional-outreach', 'public-post', 'quick-chat', 'sensitive-note', 'team-update'].sort(),
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
    assert.equal(specimen.provenance.approval_status, 'editorial-review-required');
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
