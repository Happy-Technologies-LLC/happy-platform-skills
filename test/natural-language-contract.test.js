import { describe, expect, test } from '@jest/globals';
import { readFile, readdir } from 'fs/promises';

function unquote(value) {
  return value?.replace(/^(["'])(.*)\1$/, '$2');
}

async function executableNaturalLanguageBlocks() {
  const skillsUrl = new URL('../skills/', import.meta.url);
  const paths = (await readdir(skillsUrl, { recursive: true }))
    .filter(path => path.endsWith('/SKILL.md'));
  const blocks = [];
  for (const path of paths) {
    const markdown = await readFile(new URL(path, skillsUrl), 'utf8');
    for (const fence of markdown.matchAll(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)) {
      const lines = fence[1].split('\n');
      let active = null;
      const flush = () => {
        if (active?.tool !== 'SN-Natural-Language-Search') return;
        const parameters = active.lines.join('\n');
        blocks.push({
          path: `skills/${path}`,
          line: active.line,
          table: unquote(parameters.match(/^\s*table:\s*(.+)$/m)?.[1]?.trim()),
          query: unquote(parameters.match(/^\s*query:\s*(.+)$/m)?.[1]?.trim())
        });
      };
      lines.forEach((line, index) => {
        const tool = line.match(/^\s*Tool:\s*(SN-[A-Za-z0-9-]+)\s*$/)?.[1];
        if (tool) {
          flush();
          active = {
            tool,
            line: markdown.slice(0, fence.index).split('\n').length + index + 1,
            lines: []
          };
        } else if (active) {
          active.lines.push(line);
        }
      });
      flush();
    }
  }
  return blocks;
}

describe('MCP v6.1 natural-language documentation contract', () => {
  test('ships parser-verified atomic fixtures', async () => {
    const fixture = JSON.parse(await readFile(
      new URL('../contracts/happy-platform-mcp-6.1.0-natural-language.json', import.meta.url),
      'utf8'
    ));
    expect(fixture.version).toBe('6.1.0');
    expect(fixture.source).toBe('src/natural-language.js');
    expect(fixture.supported.length).toBeGreaterThanOrEqual(12);
    for (const entry of fixture.supported) {
      expect(entry).toEqual(expect.objectContaining({
        query: expect.any(String),
        table: expect.any(String),
        encodedQuery: expect.any(String),
        unmatchedText: ''
      }));
      expect(entry.encodedQuery.length).toBeGreaterThan(0);
    }
  });

  test('skill only claims source-supported patterns and routes precision cases to encoded queries', async () => {
    const markdown = await readFile(
      new URL('../skills/itsm/natural-language-queries/SKILL.md', import.meta.url),
      'utf8'
    );
    for (const unsupportedClaim of [
      /priority is 1/i,
      /not equals/i,
      /STARTSWITH/i,
      /ENDSWITH/i,
      /NOTLIKE/i,
      /assigned to is empty/i,
      /sort by|order by/i
    ]) {
      expect(markdown).not.toMatch(unsupportedClaim);
    }
    expect(markdown).toMatch(/SN-Query-Table/);
    expect(markdown).toMatch(/encoded quer/i);
    expect(markdown).toMatch(/parser-verified/i);
  });

  test('every executable catalog search is an exact parser-verified atomic fixture', async () => {
    const fixture = JSON.parse(await readFile(
      new URL('../contracts/happy-platform-mcp-6.1.0-natural-language.json', import.meta.url),
      'utf8'
    ));
    const supported = new Map(fixture.supported.map(entry => [
      `${entry.table}\u0000${entry.query}`,
      entry
    ]));
    const failures = (await executableNaturalLanguageBlocks()).flatMap(block => {
      const expected = supported.get(`${block.table}\u0000${block.query}`);
      return expected?.encodedQuery && expected.unmatchedText === ''
        ? []
        : [`${block.path}:${block.line}: ${block.table} / ${block.query}`];
    });
    expect(failures).toEqual([]);
  });
});
