import { describe, expect, test } from '@jest/globals';

describe('package skill path verification', () => {
  test('rejects equal-sized source and package sets with different paths', async () => {
    const verificationModule = import('../scripts/package-verification-lib.mjs');
    await expect(verificationModule).resolves.toEqual(expect.objectContaining({
      assertSameSkillPaths: expect.any(Function)
    }));

    const { assertSameSkillPaths } = await verificationModule;
    expect(() => assertSameSkillPaths(
      new Set(['itsm/incident-triage', 'admin/application-scope']),
      new Set(['itsm/incident-triage', 'admin/not-a-real-skill'])
    )).toThrow(/missing.*admin\/application-scope.*unexpected.*admin\/not-a-real-skill/is);
  });

  test('normalizes npm 10 and npm 11 publish dry-run JSON shapes', async () => {
    const verificationModule = await import('../scripts/package-verification-lib.mjs');

    expect(verificationModule).toEqual(expect.objectContaining({
      parseNpmPublishDryRunVersion: expect.any(Function)
    }));

    expect(verificationModule.parseNpmPublishDryRunVersion(
      JSON.stringify({
        id: 'happy-servicenow-skills@1.2.1',
        name: 'happy-servicenow-skills',
        version: '1.2.1'
      }),
      'happy-servicenow-skills'
    )).toBe('1.2.1');

    expect(verificationModule.parseNpmPublishDryRunVersion(
      JSON.stringify({
        'happy-servicenow-skills': {
          id: 'happy-servicenow-skills@1.2.1',
          version: '1.2.1'
        }
      }),
      'happy-servicenow-skills'
    )).toBe('1.2.1');
  });

  test('normalizes npm 11 array and npm 12 keyed pack JSON shapes', async () => {
    const { parseNpmPackResult } = await import('../scripts/package-verification-lib.mjs');
    const result = { name: 'happy-servicenow-skills', filename: 'happy-servicenow-skills-1.2.1.tgz', files: [] };

    expect(parseNpmPackResult(JSON.stringify([result]), 'happy-servicenow-skills')).toEqual(result);
    expect(parseNpmPackResult(JSON.stringify({ 'happy-servicenow-skills': result }), 'happy-servicenow-skills'))
      .toEqual(result);
    expect(() => parseNpmPackResult(JSON.stringify([result]), 'happy-platform-skills'))
      .toThrow(/happy-platform-skills/);
  });
});
