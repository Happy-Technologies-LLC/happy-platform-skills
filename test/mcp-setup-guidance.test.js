import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

const files = {
  installation: 'skills/development/mcp-server-installation/SKILL.md',
  instances: 'skills/admin/instance-management/SKILL.md',
  docsOnly: 'skills/development/servicenow-docs-mcp/SKILL.md',
  server: 'skills/development/mcp-server/SKILL.md',
  crud: 'skills/admin/generic-crud-operations/SKILL.md',
  authoring: 'docs/CREATING_SKILLS.md'
};

const contents = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([name, path]) => [
    name,
    await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  ])
));

function fencedExamples(markdown) {
  return [...markdown.matchAll(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)]
    .map(match => match[1]);
}

function inlineCodeSnippets(markdown) {
  const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, '');
  return [...prose.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)]
    .map(match => match[1]);
}

function containsSecretCommand(example) {
  const secretOption = /--(?:password|client-secret|(?:access-|api-)?token|api-key|apikey)(?:=\S+|[ \t]+\S+)/i;
  const curlUserOption = /\bcurl\b[\s\S]*?(?:^|[ \t])(?:-u(?:=|[ \t]+)?\S+|--user(?:=\S+|[ \t]+\S+))/im;
  const headerOption = /(?:-H(?:=|[ \t]*)|--header(?:=|[ \t]+))["']?(?:Authorization|X-API-Key)["']?\s*:/i;
  const rawCredentialHeader = /(?:^|\s)["']?(?:Authorization|X-API-Key)["']?\s*:/im;
  return [secretOption, curlUserOption, headerOption, rawCredentialHeader]
    .some(pattern => pattern.test(example));
}

function unsafeSecretExamples(markdown) {
  return [...fencedExamples(markdown), ...inlineCodeSnippets(markdown)]
    .filter(containsSecretCommand);
}

function positiveDocsOnlyRecommendations(markdown) {
  const recommendations = [];

  for (const example of fencedExamples(markdown)) {
    if (/--docs-only\b/i.test(example)) recommendations.push(example);
  }

  const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, '');
  for (const line of prose.split('\n').filter(candidate => /--docs-only\b/i.test(candidate))) {
    const clauses = line.split(/\s*(?:[.;]|\bbut\b|\bhowever\b|\byet\b|\bnevertheless\b)\s*/i);
    for (const clause of clauses.filter(candidate => /--docs-only\b/i.test(candidate))) {
      const explicitlyNegative = /\b(?:do not|don't|never|must not|avoid)\b|\b(?:unreliable|broken)\b|\b(?:does not|doesn't|cannot|can't|not reliably)\b/i.test(clause);
      const recommendsUse = /\b(?:use|run|recommend|launch|start|invoke|pass|configure|add|set)\b/i.test(clause);
      if (recommendsUse && !explicitlyNegative) recommendations.push(clause);
    }
  }

  return recommendations;
}

describe('Happy Platform MCP setup guidance', () => {
  test.each(Object.entries(contents))('%s contains no secret-bearing examples', (_name, markdown) => {
    const forbidden = [
      /["'](?:password|clientSecret|client_secret|access_token|token)["']\s*:/i,
      /["'][^"'\n]*(?:PASSWORD|CLIENT_SECRET|ACCESS_TOKEN|API_TOKEN)[^"'\n]*["']\s*:/i,
      /^\s*(?:password|clientSecret|client_secret|access_token|token)\s*:/im,
      /\bexport\s+\w*(?:PASSWORD|SECRET|TOKEN)\w*=/i,
      /\b\w*(?:PASSWORD|CLIENT_SECRET|ACCESS_TOKEN|API_TOKEN)\w*\s*=/i,
      /client_secret\s*=/i
    ];

    for (const pattern of forbidden) {
      expect(markdown).not.toMatch(pattern);
    }
    expect(unsafeSecretExamples(markdown)).toEqual([]);
  });

  test.each([
    ['password argument', '```bash\nhappy-platform-mcp instance add --password VALUE\n```'],
    ['password equals argument', '```bash\nhappy-platform-mcp instance add --password=VALUE\n```'],
    ['client secret argument', '```bash\nhappy-platform-mcp instance add --client-secret VALUE\n```'],
    ['client secret equals argument', '```bash\nhappy-platform-mcp instance add --client-secret=VALUE\n```'],
    ['token argument', '```bash\nprobe --token VALUE\n```'],
    ['access token argument', '```bash\nprobe --access-token=VALUE\n```'],
    ['API token argument', '```bash\nprobe --api-token VALUE\n```'],
    ['API key argument', '```bash\nprobe --api-key=VALUE\n```'],
    ['multiline curl short user option', ['```bash', 'curl https://example.invalid \\', '  -u user:VALUE', '```'].join('\n')],
    ['multiline curl long user option', ['```bash', 'curl https://example.invalid \\', '  --user=user:VALUE', '```'].join('\n')],
    ['concatenated curl short user option', '```bash\ncurl -uuser:VALUE https://example.invalid\n```'],
    ['authorization header', '```bash\ncurl -H "Authorization: Bearer VALUE" https://example.invalid\n```'],
    ['concatenated authorization header', '```bash\ncurl -HAuthorization:"Bearer VALUE" https://example.invalid\n```'],
    ['equals authorization header', '```bash\ncurl --header="Authorization: Bearer VALUE" https://example.invalid\n```'],
    ['API key header', '```bash\ncurl -H "X-API-Key: VALUE" https://example.invalid\n```']
  ])('detects unsafe fenced %s', (_name, markdown) => {
    expect(unsafeSecretExamples(markdown)).toHaveLength(1);
  });

  test('allows prose that explains forbidden credential patterns', () => {
    const policy = 'Never use --password VALUE or generate an Authorization: header in documentation.';
    expect(unsafeSecretExamples(policy)).toEqual([]);
  });

  test('rejects an unsafe inline literal even in a policy warning', () => {
    expect(unsafeSecretExamples('Never run `probe --password VALUE`; use a masked prompt.')).toHaveLength(1);
  });

  test('rejects a directly negated unsafe inline command', () => {
    expect(unsafeSecretExamples('Do not run `probe --password VALUE`.')).toHaveLength(1);
  });

  test.each([
    ['negative list', 'Never run, copy, or document `probe --password VALUE`.'],
    ['negative parenthetical', 'Do not, under any circumstances, run `probe --password VALUE`.']
  ])('rejects an unsafe inline literal inside a %s', (_name, markdown) => {
    expect(unsafeSecretExamples(markdown)).toHaveLength(1);
  });

  test.each([
    ['secret option', 'Run `happy-platform-mcp instance add --password VALUE` now.'],
    ['curl user option', 'Run `curl -u user:VALUE https://example.invalid` now.'],
    ['credential header', 'Run `curl --header="Authorization: Bearer VALUE" https://example.invalid` now.']
  ])('detects an inline %s outside a fence', (_name, markdown) => {
    expect(unsafeSecretExamples(markdown)).toHaveLength(1);
  });

  test('rejects an unsafe inline command after an earlier policy warning', () => {
    const mixed = 'Never use the old flow; run `probe --password VALUE` now.';
    expect(unsafeSecretExamples(mixed)).toHaveLength(1);
  });

  test.each([
    ['period', 'Never use the old flow. Run `probe --password VALUE` now.'],
    ['comma', 'Never use the old flow, run `probe --password VALUE` now.'],
    ['comma and instead', 'Never use the old flow, instead run `probe --password VALUE` now.']
  ])('rejects an unsafe inline literal after a %s boundary', (_name, markdown) => {
    expect(unsafeSecretExamples(markdown)).toHaveLength(1);
  });

  test('installation documents the supported local CLI and storage model', () => {
    expect(contents.installation).toMatch(/Node(?:\.js)?\s*(?:version\s*)?>=\s*20/i);
    for (const command of ['add', 'list', 'update', 'remove', 'test', 'migrate']) {
      expect(contents.installation).toContain(`happy-platform-mcp instance ${command}`);
    }
    expect(contents.installation).toContain('happy-platform-mcp instance credential set');
    expect(contents.installation).toContain('~/.config/happy-platform-mcp/instances.json');
    expect(contents.installation).toContain('HAPPY_CONFIG_PATH');
    expect(contents.installation).toMatch(/masked prompts?/i);
    expect(contents.installation).toMatch(/OS keychain/i);
    expect(contents.installation).toMatch(/remove[^\n]+re-add/i);
    expect(contents.installation).toMatch(/read-only legacy migration input/i);
    expect(contents.installation).toMatch(/leaves? the legacy source untouched/i);
  });

  test('installation covers the four authentication choices', () => {
    for (const authMode of ['Basic', 'client_credentials', 'OAuth password', 'authorization_code']) {
      expect(contents.installation).toContain(authMode);
    }
    expect(contents.installation).toMatch(/authorization_code[^\n]+zero-static-secret/i);
  });

  test.each(['installation', 'docsOnly'])('%s independently documents docs-only and registration behavior', name => {
    const guidance = contents[name];
    expect(guidance).toContain('HAPPY_MCP_DOCS_ONLY=true');
    expect(positiveDocsOnlyRecommendations(guidance)).toEqual([]);
    expect(guidance).toMatch(/automatic(?:ally)?[^\n]*docs-only/i);
    expect(guidance).toMatch(/metadata-only[^\n]*SN-Register-Instance|SN-Register-Instance[^\n]*metadata-only/i);
    expect(guidance).toMatch(/rejects? secret fields?/i);
    expect(guidance).toMatch(/live[^\n]*reload/i);
    expect(guidance).toMatch(/restart[^\n]*docs-only|docs-only[^\n]*restart/i);
    expect(guidance).toMatch(/externally preprovisioned deterministic keychain refs?/i);
  });

  test.each([
    ['fenced command', '```bash\nhappy-platform-mcp --docs-only\n```'],
    ['imperative prose', 'Run `happy-platform-mcp --docs-only` to start documentation mode.'],
    ['recommendation prose', 'We recommend using `--docs-only` for documentation mode.']
  ])('detects a positive docs-only recommendation in %s', (_name, markdown) => {
    expect(positiveDocsOnlyRecommendations(markdown)).toHaveLength(1);
  });

  test('allows an explicit warning about the unreliable docs-only flag', () => {
    const policy = 'The `--docs-only` flag is unreliable and must not be used; set `HAPPY_MCP_DOCS_ONLY=true` instead.';
    expect(positiveDocsOnlyRecommendations(policy)).toEqual([]);
  });

  test('rejects a mixed warning and positive docs-only recommendation', () => {
    const mixed = 'The `--docs-only` flag is unreliable, but run `happy-platform-mcp --docs-only` anyway.';
    expect(positiveDocsOnlyRecommendations(mixed)).toHaveLength(1);
  });

  test('instance routing uses the live tools and concurrency semantics', () => {
    expect(contents.instances).not.toContain('SN-List-Instances');
    expect(contents.instances).toContain('SN-Set-Instance');
    expect(contents.instances).toContain('SN-Get-Current-Instance');
    expect(contents.instances).toMatch(/parameterless[^\n]*SN-Set-Instance|SN-Set-Instance[^\n]*parameterless/i);
    expect(contents.instances).toMatch(/session(?:'s)?[^\n]*implicit target/i);
    expect(contents.instances).toMatch(/explicit[^\n]*instance[^\n]*(?:concurrent|critical)/i);
    expect(contents.instances).toMatch(/optional[^\n]*instance[^\n]*except[^\n]*SN-Register-Instance[^\n]*SN-Set-Instance[^\n]*SN-Get-Current-Instance[^\n]*SN-Docs/i);
  });

  test('registration examples never include a per-call instance field', () => {
    const registrationExamples = fencedExamples(contents.installation)
      .filter(example => /Tool:\s*SN-Register-Instance/.test(example));
    expect(registrationExamples.length).toBeGreaterThan(0);
    for (const example of registrationExamples) {
      expect(example).not.toMatch(/^\s*instance\s*:/im);
    }
  });

  test('touched MCP tool names use the live aliases', () => {
    const guidance = Object.values(contents).join('\n');
    expect(guidance).not.toMatch(/\bSN-Read-Record\b/);
    expect(guidance).not.toMatch(/\bSN-NL-Search\b/);
  });
});
