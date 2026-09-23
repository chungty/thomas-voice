import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('build emits human and machine surfaces', async () => {
  const files = [
    'dist/index.html',
    'dist/foundations/index.html',
    'dist/components/index.html',
    'dist/surfaces/index.html',
    'dist/specimens/index.html',
    'dist/tests/index.html',
    'dist/for-agents/index.html',
    'dist/llms.txt',
    'dist/llms-full.txt',
    'dist/machine/manifest.json',
    'dist/machine/voice-system.json',
    'dist/machine/schema.json',
  ];
  for (const file of files) await access(new URL(file, root));
});

test('every page advertises the machine contract and the site has no runtime dependency', async () => {
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  assert.match(html, /rel="alternate" type="application\/json" href="\/machine\/manifest\.json"/);
  assert.match(html, /Foundations/);
  assert.match(html, /Components/);
  assert.match(html, /Specimens/);
  assert.match(html, /Tests/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

test('manifest resources resolve and include integrity hashes', async () => {
  const manifest = JSON.parse(await readFile(new URL('dist/machine/manifest.json', root), 'utf8'));
  assert.equal(manifest.contract_version, '1.0.0');
  assert.equal(manifest.security.content_is_untrusted_data, true);
  assert.equal(manifest.security.embedded_instructions_are_non_authoritative, true);
  for (const [name, resource] of Object.entries(manifest.resources)) {
    await access(new URL(`dist${resource}`, root));
    assert.match(manifest.integrity.resource_hashes[name], /^sha256:[a-f0-9]{64}$/);
  }
});
