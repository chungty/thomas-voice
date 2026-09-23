import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

const forbidden = [/payroll/i,/insufficient funds/i,/anthropic credits/i,/notion query/i,/slack_id/i,/U02TBQDUR/i,/cc @/i];

test('voice system exposes the v2 editorial compiler and compatibility presets', async () => {
  const system = await load('src/voice-system.json');
  assert.equal(system.id, 'thomas-public-voice');
  assert.equal(system.contract_version, '2.0.0');
  assert.deepEqual(system.precedence.slice(0, 3), ['truth_privacy_safety_authorization','task_and_meaning_fidelity','stakes_and_review']);
  assert.ok(system.foundations.length >= 7);
  assert.ok(system.components.length >= 8);
  assert.deepEqual(system.compatibility_presets.map((x) => x.id).sort(), ['agent-handoff','email','long-form','neutral-public','professional-outreach','public-post','quick-chat','sensitive-note','team-update'].sort());
  assert.deepEqual(system.dimensions.medium.values, ['written', 'spoken']);
  assert.ok(system.intents.length >= 10);
  assert.ok(system.reader_conditions.fields.length >= 8);
  assert.ok(system.platforms.some((x) => x.id === 'x'));
  assert.ok(system.platforms.some((x) => x.id === 'linkedin'));
  assert.ok(system.platforms.some((x) => x.id === 'instagram'));
  assert.ok(system.spoken.transforms.length >= 8);
});

test('every normative rule is test-linked and every specimen is annotated', async () => {
  const system = await load('src/voice-system.json');
  const rules = [...system.foundations,...system.components,...system.intents,...system.relationships,...system.platforms,...system.forms,...system.compatibility_presets];
  for (const item of rules) {
    assert.ok(item.id, 'content unit needs an id');
    assert.ok(item.test_ids?.length, `${item.id} needs test_ids`);
  }
  assert.ok(system.specimens.length >= 16);
  const ids = [...rules,...system.specimens,...system.tests].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'all public IDs must be unique');
  const testIds = new Set(system.tests.map((x) => x.id));
  for (const item of rules) for (const id of item.test_ids) assert.ok(testIds.has(id), `${item.id} references missing ${id}`);
  for (const specimen of system.specimens) {
    assert.ok(specimen.annotation);
    assert.ok(specimen.generalize?.length);
    assert.ok(specimen.do_not_copy?.length);
    assert.equal(specimen.public_safe, true);
    assert.equal(specimen.provenance.source_class, 'synthetic');
    assert.equal(specimen.provenance.approval_status, 'approved-for-public-v2');
  }
});

test('omitted dimensions resolve conservatively', async () => {
  const system = await load('src/voice-system.json');
  assert.equal(system.resolver.defaults.relationship, 'unknown');
  assert.equal(system.resolver.defaults.stakes, 'moderate');
  assert.equal(system.resolver.non_inferable.includes('authorization'), true);
  assert.equal(system.resolver.non_inferable.includes('relationship_history'), true);
  assert.equal(system.resolver.outcomes.includes('needs_input'), true);
  assert.equal(system.compatibility_presets.find((x) => x.id === 'neutral-public').public_safe, true);
});

test('public source contains no known private-source markers', async () => {
  const raw = await readFile(new URL('src/voice-system.json', root), 'utf8');
  for (const pattern of forbidden) assert.doesNotMatch(raw, pattern);
});

test('authorship, authority, and resemblance are hard boundaries', async () => {
  const { boundaries } = await load('src/voice-system.json');
  assert.equal(boundaries.generated_output, 'draft_for_review');
  assert.equal(boundaries.may_claim_authorship, false);
  assert.equal(boundaries.may_authorize_actions, false);
  assert.equal(boundaries.may_invent_personal_experience, false);
  assert.equal(boundaries.voice_resemblance_is_identity_verification, false);
  assert.equal(boundaries.fidelity_target, 'editorial-decisions-not-resemblance');
  assert.equal(boundaries.malicious_republication_can_be_prevented, false);
});

test('v2 context units avoid personality adapters and stereotypes', async () => {
  const system = await load('src/voice-system.json');
  for (const platform of system.platforms) {
    assert.ok(platform.affordances, `${platform.id} needs affordances`);
    assert.equal('tone' in platform, false, `${platform.id} must not define a personality`);
  }
  for (const preset of system.audience_presets) assert.equal(preset.inferable, false);
});

test('specimen comparisons declare controlled and invariant dimensions', async () => {
  const system = await load('src/voice-system.json');
  assert.ok(system.comparison_sets.length >= 3);
  for (const set of system.comparison_sets) {
    assert.ok(set.source_facts.length);
    const sourceIds=new Set(set.source_facts.map(x=>x.id));
    assert.equal(sourceIds.size,set.source_facts.length);
    for(const claim of set.source_facts) {
      assert.ok(claim.id);
      assert.ok(claim.text);
      assert.ok(['fact','uncertainty','recommendation'].includes(claim.type));
    }
    assert.ok(set.manipulated_dimension);
    assert.ok(set.permitted_changes.length);
    assert.ok(set.forbidden_changes.includes('facts'));
    assert.ok(set.variants.length >= 2);
    for (const variant of set.variants) {
      assert.ok(variant.id, `${set.id} variant needs id`);
      assert.ok(variant.label, `${set.id} variant needs label`);
      assert.ok(variant.context, `${set.id} variant needs context`);
      assert.ok(variant.text, `${set.id} variant needs rendered text`);
      assert.deepEqual(new Set(variant.claim_ids),sourceIds,`${set.id}/${variant.id} must preserve every claim and add none`);
    }
  }
});

test('evaluation suite covers resolver, reader, spoken, and hostile-input invariants', async () => {
  const system = await load('src/voice-system.json');
  const ids = new Set(system.tests.map((x) => x.id));
  for (const id of ['boundary.identity-claim','fidelity.surface-shift','privacy.public-only','resolver.idempotence','audience.role-counterfactual','spoken.interruption-survival','security.untrusted-fields','platform.confidence-invariant','stakes.monotonic']) assert.ok(ids.has(id), id);
  const types = new Set(system.tests.map((x) => x.type));
  for (const type of ['deterministic','metamorphic','adversarial','human-review']) assert.ok(types.has(type));
});
