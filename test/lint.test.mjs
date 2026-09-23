import test from 'node:test';
import assert from 'node:assert/strict';
import { lintDraft } from '../src/lint.mjs';

const base = { surface: 'quick-chat', authorship: 'draft-for-review', requiredFacts: ['The build passed.'], prohibitedClaims: [] };

for (const text of [
  'I am Thomas. The build passed.',
  "I'm Thomas. The build passed.",
  'I’m Thomas. The build passed.',
  'This is Thomas. The build passed.',
  'Speaking as Thomas: the build passed.',
  'Thomas here. The build passed.',
  'My name is Thomas Chung. The build passed.',
]) test(`lint blocks identity claim: ${text}`, () => assert.ok(lintDraft(text, base).failures.some(f => f.id === 'boundary.identity-claim')));

for (const text of [
  'I approved the payment. The build passed.',
  'I approve the payment. The build passed.',
  'I have authorized the transfer. The build passed.',
  'We approved the payment. The build passed.',
  'Thomas approves the payment. The build passed.',
  'Speaking as Thomas: we authorized the transfer. The build passed.',
  'You have my approval to send it. The build passed.',
  'I consent to the transfer. The build passed.',
  'Go ahead on my behalf. The build passed.',
]) test(`lint blocks authorization claim: ${text}`, () => assert.ok(lintDraft(text, base).failures.some(f => f.id === 'boundary.authorization-claim')));

test('lint rejects missing, empty, negated, and prohibited claims', () => {
  assert.ok(lintDraft('Still checking.', base).failures.some(f => f.id === 'fidelity.required-fact'));
  assert.ok(lintDraft('The build passed. Not really.', base).failures.some(f => f.id === 'fidelity.fact-negated'));
  assert.ok(lintDraft('Anything', {...base, requiredFacts:['']}).failures.some(f => f.id === 'fidelity.invalid-fact'));
  assert.ok(lintDraft('We guarantee the result. The build passed.', {...base, prohibitedClaims:['guarantee']}).failures.some(f => f.id === 'fidelity.prohibited-claim'));
});

test('lint catches AI cadence and passes a bounded status', () => {
  assert.ok(lintDraft('Here is what you need to know — it is not just a build, it is a milestone.', base).failures.some(f => f.id === 'voice.ai-cadence'));
  assert.equal(lintDraft('The build passed. I still need to check the live page before calling it done.', base).passed, true);
});
