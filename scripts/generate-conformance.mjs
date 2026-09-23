import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from '../src/resolver.mjs';
const url = new URL('../src/conformance.json', import.meta.url);
const suite = JSON.parse(await readFile(url, 'utf8'));
suite.fixtures = suite.fixtures.map(({id, description, input}) => ({id, description, input, expected: resolve(input)}));
await writeFile(url, `${JSON.stringify(suite, null, 2)}\n`);
