# Releasing

Use this flow to publish `happy-platform-skills` from a clean release branch.
Never publish an artifact that is not represented by a reviewed, pushed tag.

## Versioning

- Patch: documentation-only changes and compatible fixes.
- Minor: new skills, changed discovery behavior, or new CLI behavior.
- Major: breaking package, CLI, or skill-layout changes.

Keep the version synchronized in `package.json`, `package-lock.json`, the root
`SKILL.md`, and `CHANGELOG.md`.

## 1. Prepare and verify the release tree

Start from the intended mainline commit with a clean worktree, then update the
version without creating a tag:

```bash
npm version <version> --no-git-tag-version
```

Replace the release heading's `Unreleased` marker in `CHANGELOG.md` with the
actual release date in `YYYY-MM-DD` form before committing.

Run every release gate:

```bash
npm ci
npm test
npm run validate
npm run contract:check
npm run contract:nl-check
npm audit --omit=dev
npm run verify:package
npm run publish:dry-run
npx skills add . --list --full-depth
```

Review the complete change set. Stage all intended release files, then inspect
the staged tree before committing:

```bash
git diff --check
git status --short
git add --all
git diff --cached --stat
git diff --cached
git commit -m "Release v<version>"
```

Confirm the release commit is clean and contains the synchronized versions:

```bash
git status --short
git show --stat --oneline HEAD
node -p "require('./package.json').version"
npm run verify:package
```

## 2. Tag and push the exact reviewed commit

Create an annotated tag on the verified commit, confirm its target, then push
the commit and tag before publishing to npm:

```bash
git tag -a v<version> -m "Release v<version>"
git rev-parse HEAD
git rev-list -n 1 v<version>
git push origin HEAD:main
git push origin v<version>
```

The two hashes printed by `git rev-parse` and `git rev-list` must match. Verify
the pushed tag in the remote repository before continuing.

## 3. Authenticate and publish the tagged artifact

Publish only while the clean worktree is still at the pushed tag:

```bash
git describe --exact-match --tags HEAD
npm whoami
npm publish --access public
npm view happy-platform-skills version
```

## 4. Publish the legacy compatibility repair separately

The root package intentionally excludes `migration/`. The repaired legacy shim
is a separate package and release: `happy-servicenow-skills@1.2.1`. Publish it
only after `happy-platform-skills@2.4.0` is available from npm:

```bash
cd migration/happy-servicenow-skills
npm pack --dry-run
npm publish --dry-run
npm whoami
npm publish --access public
npm deprecate happy-servicenow-skills@1.2.1 "Renamed to happy-platform-skills; install happy-platform-skills instead."
npm view happy-servicenow-skills@1.2.1 version deprecated
```

The shim source is part of the already-pushed root release tag, but the shim
tarball and deprecation command are separate npm operations.

## Rollback realities

- A published npm version cannot be reused or overwritten. If published content
  is wrong, prepare a new version; do not try to reuse the old version number.
- Never move a pushed release tag. If npm publishing fails transiently, retry
  from the exact clean tagged commit.
- If a failure requires code changes after the tag was pushed, prepare a new
  version and tag rather than rewriting public history.
- Deprecation is the normal recovery mechanism for an installable but superseded
  npm version. Unpublishing is policy-limited and should not be treated as a
  routine rollback.
