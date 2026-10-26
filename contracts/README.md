# MCP tool contract

`happy-platform-mcp-6.1.0.json` is the packaged compatibility contract for
`happy-platform-mcp` 6.1.0. It is generated from the sibling MCP repository and
does not create a runtime or peer dependency.

From this repository, refresh and verify it with:

```bash
npm run contract:refresh
npm run contract:check
```

Review the manifest diff whenever the MCP version or registered tool inventory
changes. A version change requires a new versioned manifest and corresponding
validator compatibility decision.

`happy-platform-mcp-6.1.0-natural-language.json` records atomic phrases verified
against the v6.1 parser and negative fixtures that require encoded-query
precision. Verify it against the sibling source with:

```bash
npm run contract:nl-check
```

`task4-skill-version-baseline.json` snapshots the historical skill paths and
versions used by the Task 4 migration tests. Keeping this baseline in the
package makes the version assertions deterministic in shallow source checkouts;
the default test suite does not require the referenced Git commits to exist.
