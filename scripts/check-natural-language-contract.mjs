#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const sourceRoot = resolve(option('--source', join(repositoryRoot, '..', 'happy-platform-mcp')));
const fixturePath = resolve(option(
  '--fixture',
  join(repositoryRoot, 'contracts', 'happy-platform-mcp-6.1.0-natural-language.json')
));
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const sourcePackage = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'));

if (sourcePackage.version !== fixture.version) {
  throw new Error(`MCP version mismatch: fixture is ${fixture.version}, source package is ${sourcePackage.version}`);
}

const parserUrl = pathToFileURL(join(sourceRoot, fixture.source));
const { parseNaturalLanguage } = await import(parserUrl.href);
const failures = [];

for (const entry of fixture.supported) {
  const result = parseNaturalLanguage(entry.query, entry.table);
  if (result.encodedQuery !== entry.encodedQuery || result.unmatchedText !== entry.unmatchedText) {
    failures.push(`${entry.query}: expected ${entry.encodedQuery} / ${entry.unmatchedText}; got ${result.encodedQuery} / ${result.unmatchedText}`);
  }
}

for (const entry of fixture.precisionOnly) {
  const result = parseNaturalLanguage(entry.query, entry.table);
  if (result.encodedQuery !== entry.observedEncodedQuery || result.unmatchedText !== entry.observedUnmatchedText) {
    failures.push(`${entry.query}: observed parser behavior changed; review the precision-only guidance`);
  }
}

if (failures.length > 0) {
  throw new Error(`Natural-language contract mismatch:\n${failures.join('\n')}`);
}

console.log(`Natural-language contract verified: ${fixture.supported.length} supported, ${fixture.precisionOnly.length} precision-only fixtures`);
