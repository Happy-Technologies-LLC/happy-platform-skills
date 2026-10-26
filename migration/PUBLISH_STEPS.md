# Legacy Package Compatibility Release

The original rename published `happy-platform-skills@2.0.0` and deprecated
`happy-servicenow-skills@1.2.0`. The legacy loader export in 1.2.0 was invalid,
so version 1.2.1 is a final compatibility repair.

The root npm package intentionally excludes this migration directory. Publishing
`happy-platform-skills@2.4.0` does **not** publish the legacy repair.

## Prerequisites

1. Complete the root release procedure in `docs/RELEASING.md`.
2. Confirm `happy-platform-skills@2.4.0` is available from npm.
3. Check out the exact pushed root release tag with a clean worktree.

## Verify the 1.2.1 shim

From the repository root:

```bash
npm test -- test/migration-shim.test.js
cd migration/happy-servicenow-skills
npm pack --dry-run
npm publish --dry-run
```

The tarball must report version 1.2.1 and include `index.js`, `loader.js`,
`cli.js`, `README.md`, and `package.json`. The publish dry run must complete
without npm metadata-correction warnings.

## Publish and deprecate

From `migration/happy-servicenow-skills`:

```bash
npm whoami
npm publish --access public
npm deprecate happy-servicenow-skills@1.2.1 "Renamed to happy-platform-skills; install happy-platform-skills instead."
npm view happy-servicenow-skills@1.2.1 version deprecated
```

This is a separate npm publish from the root package. Do not tag, push, or
publish from this directory independently of the reviewed root release tag.

## Supported compatibility surface

- Root imports re-export `happy-platform-skills`.
- `happy-servicenow-skills/loader` re-exports the current loader.
- The legacy `sn-skills` CLI forwards through the current public CLI export.
- Raw skill assets must be imported through `happy-platform-skills`; the old
  package's raw `skills/*` target was never a valid Node.js export.
