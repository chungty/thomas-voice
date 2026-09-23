import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

const root = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('published JSON schema compiles and validates request and response envelopes', async () => {
  const schema = await load('src/schema.json');
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  const validate = ajv.compile(schema);

  const request = {
    kind: 'request',
    surface: 'quick-chat',
    intent: 'recommend',
    audience: { kind: 'collaborator', knowledge_level: 'expert' },
    authorship: { mode: 'draft-for-review', may_speak_as_thomas: false, may_attribute_to_thomas: false },
    content: { facts: [{ id: 'fact-1', text: 'The build passed.', source: 'user-provided', confidence: 1 }], required_points: [], prohibited_claims: [] },
    constraints: { sensitivity: 'public' }
  };
  assert.equal(validate(request), true, JSON.stringify(validate.errors));

  const response = {
    kind: 'response', draft: 'The build passed.', applied_rules: ['foundation.job-first'],
    unresolved: [], review_flags: [], authorized_to_publish: false,
    validation: { deterministic: { passed: true, failures: [] } }
  };
  assert.equal(validate(response), true, JSON.stringify(validate.errors));
});

test('schema fails closed on malformed, unknown, or unsafe requests', async () => {
  const schema = await load('src/schema.json');
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  for (const value of [
    {},
    'anything',
    { kind: 'request', surface: 'unknown', intent: 'x', audience: {}, authorship: { mode: 'draft-for-review', may_speak_as_thomas: false, may_attribute_to_thomas: false }, content: { facts: [] } },
    { kind: 'request', surface: 'quick-chat', intent: 'x', audience: {}, authorship: { mode: 'draft-for-review', may_speak_as_thomas: true, may_attribute_to_thomas: false }, content: { facts: [] } },
    { kind: 'request', surface: 'quick-chat', intent: 'x', audience: {}, authorship: { mode: 'draft-for-review', may_speak_as_thomas: false }, content: { facts: [] } },
  ]) assert.equal(validate(value), false, `unexpectedly valid: ${JSON.stringify(value)}`);
});
