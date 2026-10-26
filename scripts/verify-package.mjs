#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SkillRegistry } from '../src/registry.js';
import { assertSameSkillPaths, parseNpmPackResult } from './package-verification-lib.mjs';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd = repositoryRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }

  return result.stdout.trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'happy-platform-skills-package-'));

try {
  const packOutput = run('npm', ['pack', '--json', '--pack-destination', temporaryRoot]);
  const packResult = parseNpmPackResult(packOutput, 'happy-platform-skills');
  const packagedPaths = new Set(packResult.files.map(file => file.path));
  const tarballPath = join(temporaryRoot, packResult.filename);

  const requiredPaths = [
    'package.json',
    'SKILL.md',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    'NOTICE',
    'src/index.js',
    'src/loader.js',
    'src/registry.js',
    'src/validator.js',
    'src/cli.js',
    'scripts/verify-package.mjs',
    'scripts/package-verification-lib.mjs',
    'scripts/refresh-mcp-tool-contract.mjs',
    'scripts/check-natural-language-contract.mjs',
    'contracts/happy-platform-mcp-6.1.0.json',
    'contracts/happy-platform-mcp-6.1.0-natural-language.json',
    'contracts/README.md',
    'skills/itsm/incident-triage/SKILL.md'
  ];

  for (const requiredPath of requiredPaths) {
    assert(packagedPaths.has(requiredPath), `Package is missing required path: ${requiredPath}`);
  }

  const packagedSkillPaths = new Set([...packagedPaths]
    .filter(path => /^skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(path))
    .map(path => path.replace(/^skills\//, '').replace(/\/SKILL\.md$/, '')));
  assert(packagedSkillPaths.size > 0, 'Package contains no discoverable skills');

  const sourceRegistry = new SkillRegistry();
  await sourceRegistry.discover();
  const sourceSkillPaths = new Set(sourceRegistry.getAll().map(skill => skill.path));
  assertSameSkillPaths(sourceSkillPaths, packagedSkillPaths);

  const consumerDir = join(temporaryRoot, 'consumer');
  await mkdir(consumerDir);
  run('npm', ['init', '--yes'], consumerDir);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], consumerDir);

  const installedPackageJson = JSON.parse(
    await readFile(join(consumerDir, 'node_modules', 'happy-platform-skills', 'package.json'), 'utf8')
  );
  assert(installedPackageJson.dependencies['js-yaml'] === '3.15.2', 'Published package must pin js-yaml 3.15.2');

  const dependencyTree = JSON.parse(run('npm', ['ls', 'js-yaml', '--all', '--json'], consumerDir));
  const installedJsYaml = dependencyTree.dependencies?.['happy-platform-skills']?.dependencies?.['js-yaml'];
  assert(installedJsYaml?.version === '3.15.2', 'Clean consumer did not resolve js-yaml 3.15.2');

  run(process.execPath, [
    '--input-type=module',
    '--eval',
    "const pkg = await import('happy-platform-skills'); if (!pkg.SkillLoader || !pkg.SkillRegistry || !pkg.SkillValidator) process.exit(1);"
  ], consumerDir);

  const binDir = join(consumerDir, 'node_modules', '.bin');
  const hpsBin = join(binDir, 'hps');
  const legacyBin = join(binDir, 'sn-skills');
  await access(hpsBin);
  await access(legacyBin);
  assert(run(hpsBin, ['--version'], consumerDir) === installedPackageJson.version, 'hps version output is incorrect');
  assert(run(legacyBin, ['--version'], consumerDir) === installedPackageJson.version, 'sn-skills version output is incorrect');

  const listedSkills = JSON.parse(run(hpsBin, ['list', '--json'], consumerDir));
  const discoveredSkillPaths = new Set(listedSkills.map(skill => skill.path));
  assertSameSkillPaths(sourceSkillPaths, discoveredSkillPaths);

  console.log(`Package verification passed: ${packResult.entryCount} files, ${sourceSkillPaths.size} exact skill paths`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
