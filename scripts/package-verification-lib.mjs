export function assertSameSkillPaths(sourcePaths, candidatePaths) {
  const missing = [...sourcePaths].filter(path => !candidatePaths.has(path)).sort();
  const unexpected = [...candidatePaths].filter(path => !sourcePaths.has(path)).sort();

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error([
      'Skill path sets differ.',
      `Missing: ${missing.join(', ') || '(none)'}`,
      `Unexpected: ${unexpected.join(', ') || '(none)'}`
    ].join('\n'));
  }
}

// npm <= 11 prints `npm pack --json` as an array; npm 12 keys results by package name.
export function parseNpmPackResult(stdout, packageName) {
  const parsed = JSON.parse(stdout);
  const result = Array.isArray(parsed)
    ? parsed.find(candidate => candidate?.name === packageName)
    : parsed?.[packageName];

  if (typeof result?.filename !== 'string' || !Array.isArray(result.files)) {
    throw new Error(`npm pack JSON did not contain tarball metadata for ${packageName}`);
  }

  return result;
}

export function parseNpmPublishDryRunVersion(stdout, packageName) {
  const parsed = JSON.parse(stdout);
  const candidates = [
    parsed?.[packageName],
    parsed,
    ...(Array.isArray(parsed) ? parsed : [])
  ];
  const result = candidates.find(candidate =>
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.version === 'string' &&
    (candidate.name === packageName ||
      candidate.id === `${packageName}@${candidate.version}` ||
      candidate === parsed?.[packageName])
  );

  if (!result) {
    throw new Error(`npm publish dry-run JSON did not contain version metadata for ${packageName}`);
  }

  return result.version;
}
