import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';
import { SkillRegistry } from '../src/registry.js';

const readRepositoryFile = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

describe('release-facing documentation', () => {
  test('README category catalog exactly matches runtime discovery and uses the runtime API', async () => {
    const readme = await readRepositoryFile('README.md');
    const catalog = readme.match(/## Available Skills\n([\s\S]*?)\n---/)?.[1] ?? '';
    const documentedCounts = Object.fromEntries(
      [...catalog.matchAll(/\| `([^`]+)` \| [^|]+ \| (\d+) \|/g)]
        .map(match => [match[1], Number(match[2])])
    );
    const registry = new SkillRegistry();
    await registry.discover();

    expect(documentedCounts).toEqual(registry.getStats().byCategory);
    expect(Object.values(documentedCounts).reduce((sum, count) => sum + count, 0)).toBe(184);
    expect(readme).toContain('console.log(skill.getInstructions());');
    expect(readme).not.toContain('skill.instructions');
    expect(readme).toMatch(/exactly 60 live MCP tools/);
    expect(readme).toMatch(/six docs-only tools/);
  });

  test('release instructions commit the exact reviewed tree before publishing', async () => {
    const releasing = await readRepositoryFile('docs/RELEASING.md');

    expect(releasing.indexOf('git commit')).toBeGreaterThan(-1);
    expect(releasing.indexOf('git tag')).toBeGreaterThan(releasing.indexOf('git commit'));
    expect(releasing.indexOf('git push')).toBeGreaterThan(releasing.indexOf('git tag'));
    expect(releasing.indexOf('npm publish')).toBeGreaterThan(releasing.indexOf('git push'));
    expect(releasing.indexOf('npm publish')).toBeGreaterThan(releasing.indexOf('git commit'));
    expect(releasing).not.toContain('git add package.json package-lock.json');
    expect(releasing).toContain('npm run verify:package');
    expect(releasing).toContain('npm audit --omit=dev');
    expect(releasing).toMatch(/Unreleased.*YYYY-MM-DD/s);
    expect(releasing).toMatch(/cannot be reused|cannot reuse/i);
    expect(releasing).toMatch(/migration\/happy-servicenow-skills[\s\S]*npm publish --dry-run/);
  });
});
