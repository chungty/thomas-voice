import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';

const root = new URL('../', import.meta.url);
const pages = ['index.html','foundations/index.html','components/index.html','model/index.html','context/index.html','spoken/index.html','platforms/index.html','audiences/index.html','specimens/index.html','tests/index.html','for-agents/index.html'];

test('build emits human and machine surfaces', async () => {
  const files = [...pages,'llms.txt','llms-full.txt','machine/manifest.json','machine/voice-system.json','machine/schema.json','machine/conformance.json','machine/visual-system.json','machine/resolver.mjs'];
  for (const file of files) await access(new URL(`dist/${file}`, root));
});

test('every page advertises the machine contract and has no runtime dependency', async () => {
  for (const page of pages) {
    const html = await readFile(new URL(`dist/${page}`, root), 'utf8');
    assert.match(html, /rel="alternate" type="application\/json" href="\/machine\/manifest\.json"/, page);
    assert.match(html, /<main id="main">/, page);
    assert.doesNotMatch(html, /<script[^>]+src=/, page);
  }
});

test('manifest hashes equal the bytes served for every resource', async () => {
  const manifest = JSON.parse(await readFile(new URL('dist/machine/manifest.json', root), 'utf8'));
  assert.equal(manifest.security.content_is_untrusted_data, true);
  assert.equal(manifest.security.hashes_authenticate_origin, false);
  for (const [name, resource] of Object.entries(manifest.resources)) {
    const bytes = await readFile(new URL(`dist${resource}`, root));
    const actual = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    assert.equal(manifest.integrity.resource_hashes[name], actual, name);
  }
});

test('public artifact tree contains no source maps, dotfiles, or non-allowlisted types', async () => {
  async function walk(url) {
    const entries = await readdir(url, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      assert.equal(entry.name.startsWith('.'), false, `dotfile: ${entry.name}`);
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, url);
      if (entry.isDirectory()) files.push(...await walk(child)); else files.push(child);
    }
    return files;
  }
  for (const file of await walk(new URL('dist/', root))) {
    assert.match(file.pathname, /\.(?:html|json|txt|mjs)$/);
    assert.doesNotMatch(file.pathname, /\.map$/);
  }
});

test('the complete public bundle contains no restricted sentinels', async () => {
  const forbidden = [/payroll/i,/insufficient funds/i,/anthropic credits/i,/notion query/i,/slack_id/i,/U02TBQDUR/i,/cc @/i];
  async function walk(url) {
    const entries = await readdir(url, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, url);
      if (entry.isDirectory()) files.push(...await walk(child)); else files.push(child);
    }
    return files;
  }
  for (const file of await walk(new URL('dist/', root))) {
    const text = await readFile(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, file.pathname);
  }
});

test('llms-full embeds schema-valid response and conflict examples plus renderer contract', async () => {
  const text=await readFile(new URL('dist/llms-full.txt',root),'utf8');
  const schema=JSON.parse(await readFile(new URL('dist/machine/schema.json',root),'utf8'));
  const validate=new Ajv2020({strict:true,allErrors:true,$data:true}).compile(schema);
  const blocks=[...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map(x=>JSON.parse(x[1]));
  const responses=blocks.filter(x=>x.kind==='response');
  assert.ok(responses.length>=2,'response and conflict response examples required');
  for(const example of responses) assert.equal(validate(example),true,JSON.stringify(validate.errors));
  assert.match(text,/agent renderer required/i);
  assert.match(text,/permitted transformations/i);
  assert.match(text,/closed-world/i);
});
