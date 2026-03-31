# Migration Publish Steps

Follow these steps in order to transition from `happy-servicenow-skills` to `happy-platform-skills` on npm.

## Step 1: Publish `happy-platform-skills@2.0.0`

From the repo root:

```bash
npm publish
```

This publishes the main package under its new name.

## Step 2: Publish the deprecation shim as `happy-servicenow-skills@1.2.0`

```bash
cd migration/happy-servicenow-skills
npm publish
```

This publishes a final version of the old package that:
- Depends on `happy-platform-skills@^2.0.0`
- Re-exports everything from the new package
- Prints a deprecation warning on import
- Forwards the `sn-skills` CLI to the new `hps` CLI

## Step 3: Deprecate the old package on npm

```bash
npm deprecate happy-servicenow-skills "This package has been renamed to happy-platform-skills. Run: npm install happy-platform-skills"
```

This adds a visible deprecation warning in `npm search`, `npm install`, and npmjs.com.

## Step 4: Rename the GitHub repository

1. Go to Settings on https://github.com/Happy-Technologies-LLC/happy-servicenow-skills
2. Change the repository name to `happy-platform-skills`
3. GitHub will automatically redirect the old URL to the new one

## What existing users will see

- **`npm install happy-servicenow-skills`** — Gets v1.2.0 (the shim), which pulls in `happy-platform-skills`. They see a deprecation warning in the terminal.
- **`npm outdated`** — Shows the deprecation message.
- **Existing `require`/`import` calls** — Continue to work via the shim's re-exports, with a console warning.
- **`npx sn-skills`** — Still works (aliased in both old shim and new package), with a deprecation notice.
