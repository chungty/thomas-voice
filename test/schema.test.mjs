import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('agent contract defines required request fields and auditable output', async () => {
  const schema = JSON.parse(await readFile(new URL('src/schema.json', root), 'utf8'));
  assert.deepEqual(schema.request.required, ['surface', 'intent', 'audience', 'authorship', 'content']);
  assert.ok(schema.response.required.includes('draft'));
  assert.ok(schema.response.required.includes('applied_rules'));
  assert.ok(schema.response.required.includes('validation'));
  assert.equal(schema.request.properties.authorship.properties.may_speak_as_thomas.const, false);
});
