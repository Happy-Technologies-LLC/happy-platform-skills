# Releasing

Use this flow when publishing a new `happy-platform-skills` npm version.

## Versioning

- Patch: documentation-only or small fixes.
- Minor: new skills, changed discovery behavior, or new CLI behavior.
- Major: breaking package, CLI, or skill layout changes.

## Checklist

1. Ensure the worktree is clean except intended release changes.
2. Bump the version:

   ```bash
   npm version <version> --no-git-tag-version
   ```

3. Verify the package:

   ```bash
   npm run validate
   npx skills add . --list --full-depth
   npm run publish:dry-run
   ```

4. Confirm npm authentication:

   ```bash
   npm whoami
   ```

5. Publish:

   ```bash
   npm publish
   ```

6. Commit, tag, and push:

   ```bash
   git add package.json package-lock.json SKILL.md src/cli.js docs/RELEASING.md
   git commit -m "Release v<version>"
   git tag v<version>
   git push origin main
   git push origin v<version>
   ```

7. Confirm the registry version:

   ```bash
   npm view happy-platform-skills version
   ```
