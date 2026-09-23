import test from 'node:test';
import assert from 'node:assert/strict';
import { lintDraft } from '../src/lint.mjs';

const base = {
  surface: 'quick-chat',
  authorship: 'draft-for-review',
  requiredFacts: ['The build passed.'],
};

test('lint blocks identity and authorization claims', () => {
  const result = lintDraft('I am Thomas. I approved the payment.', base);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.id === 'boundary.identity-claim'));
  assert.ok(result.failures.some((failure) => failure.id === 'boundary.authorization-claim'));
});

test('lint preserves required facts and catches AI cadence', () => {
  const result = lintDraft('Here is what you need to know — it is not just a build, it is a milestone.', base);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.id === 'fidelity.required-fact'));
  assert.ok(result.failures.some((failure) => failure.id === 'voice.ai-cadence'));
});

test('lint passes a bounded direct status', () => {
  const result = lintDraft('The build passed. I still need to check the live page before calling it done.', base);
  assert.equal(result.passed, true);
});
