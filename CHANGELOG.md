# Changelog

All notable changes to Happy Platform Skills are documented here.

## 2.5.0 - 2026-10-26

### Security

- Pin `js-yaml` 3.15.2 for [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj)
  and [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)
  (CPU exhaustion in YAML parsing; previously 3.15.0).

### Changed

- Aligned catalog guidance with the versioned Happy Platform MCP v6.1 contract
  (`contracts/happy-platform-mcp-6.1.0.json`): exactly 60 live tools, adding
  `SN-Run-ATF-Test`, `SN-Run-ATF-Suite`, `SN-Get-CICD-Progress`,
  `SN-Get-ATF-Results`, and `SN-Get-ATF-Test-Logs`; docs-only startup still
  exposes six tools. The contract refresh now reads `src/cicd-atf.js`, and the
  5.1.0 manifest is removed.
- Re-verified the natural-language fixtures against the bounded MCP 6.x parser
  and renamed them to `contracts/happy-platform-mcp-6.1.0-natural-language.json`.
  All 18 supported phrases are unchanged; the precision-only
  `state not equals Closed` observation is now `state=7` (previously `7`).
- `itsm/natural-language-queries` 1.0.3: retargets the parser-verified phrases
  and fixture path to MCP 6.1.
- `admin/script-execution` 1.1.0: documents `SN-Execute-Background-Script`
  running through the Scripts - Background processor (`/sys.scripts.do`) as
  the primary path. Covers the `scope`, `record_for_rollback`, `description`,
  and `wait` parameters, what the result returns, record rollback
  (GlideRollbackWorker or the rollback context's Rollback button), scope rules
  (custom scopes run; store-app scopes answer "not authorized"; `gs.print` is
  blocked in scoped scripts), and the rule to check Script Execution History
  instead of re-running after an "Unknown outcome". `sys_trigger` is now
  described only as the automatic fallback and the `wait: false` path, with
  its caveats. Fixed the `SN-Create-Fix-Script` parameter names (`script_name`,
  `script_content`) and replaced the self-scheduling `sys_trigger` example
  with a resumable-chunk pattern.
- `admin/application-scope` 1.0.1: `SN-Set-Current-Application` and
  `SN-Set-Update-Set` are described as using the UI picker and verifying the
  change in the same session; they no longer claim to run via `sys_trigger`.
- 20 skills that list `SN-Execute-Background-Script` in their Tool Usage
  tables now give `POST /sys.scripts.do` as its endpoint instead of
  `sys_trigger`, each with a patch bump: admin/smart-assessment,
  genai/rpa-bot-generation, grc/control-objective-management,
  grc/esg-document-intelligence, grc/issue-action-plan,
  grc/issue-summarization, grc/issue-validator, grc/regulatory-alert-analysis,
  grc/risk-assessment-summarization, grc/risk-event-summarization,
  grc/suggest-remediation-tasks, grc/tprm-issue-summarization,
  hrsd/generate-talking-points, hrsd/health-safety-summarization,
  legal/contract-metadata-extraction, legal/contracts-query-enhancer,
  secops/security-recommended-actions, security/acl-management,
  security/audit-compliance, security/data-classification.
- `development/mcp-server-installation` 1.2.0: pins `happy-platform-mcp@6.1.0`
  (npm, npx, host JSON); documents the 6.0 HTTP/SSE requirement for a
  generated `HAPPY_MCP_API_TOKEN` bearer token and `HAPPY_MCP_ALLOWED_HOSTS`,
  the one-time authorization-code re-sign-in and
  `SERVICENOW_OAUTH_TRUSTED_ORIGINS` upgrade steps, and that `--docs-only` does
  not force docs-only mode in 6.1.0.
- `admin/instance-management` 1.1.2: retargets routing guidance to Happy
  Platform MCP v6.1 (tools and per-call `instance` semantics unchanged).
- `admin/script-sync` 1.1.1: retargets the explicit pull/check/push workflow
  to MCP 6.1, which still has no sync or watch tool.
- `development/servicenow-docs-mcp` 1.0.2: retargets docs-only bootstrap to
  6.1.0 and documents the 6.0 docs changes: fetches only from
  raw.githubusercontent.com ServiceNowDocs families listed in `main/llms.txt`,
  `GITHUB_TOKEN`/`docs.githubToken` removed, and old caches discarded and
  re-synced.
- `development/script-includes` 1.0.2: retargets the local-development note
  to MCP 6.1.
- `development/automated-testing` 1.1.0: runs tests with the 6.1.0 ATF tools
  (`SN-Run-ATF-Test`, `SN-Run-ATF-Suite`, `SN-Get-CICD-Progress`,
  `SN-Get-ATF-Results`, `SN-Get-ATF-Test-Logs`) instead of background or
  scheduled scripts: preflight for the `com.glide.continuousdelivery` plugin,
  the `sn_cicd.sys_ci_automation` role, and `sn_atf.runner.enabled` (restore
  after toggling), continue timed-out runs with progress instead of
  re-running, an error table for `CICD_PLUGIN_INACTIVE`, `CICD_ROLE_MISSING`,
  `ATF_RUNNER_DISABLED`, and `CICD_UNAUTHORIZED`, corrected sn_cicd pipeline
  examples (query-string run parameters, `links.progress.id`, numeric
  progress status, `rolledup_test_*_count`), and `now-sdk cicd` commands.
- `development/fluent-sdk` 1.1.0: requires now-sdk 4.14.0 (Node 20.18+) and
  happy-platform-mcp 6.1.0; uses `now-sdk install` throughout (`deploy` noted
  as an alias; package.json example `"deploy": "now-sdk install"`); adds a
  CLI-or-MCP table (`now-sdk exec` vs `SN-Execute-Background-Script`,
  `now-sdk query` vs `SN-Query-Table`, `now-sdk cicd` for CI ATF/App Repo
  promotion vs the MCP ATF tools), the Fluent APIs added in 4.10–4.14, and the
  `credentials.enc` note (not portable; CI uses environment credentials);
  fixes `SN-Execute-Background-Script` and `SN-Create-Fix-Script` example
  parameters. Removed the vendored copies of ServiceNow's agent skill
  (`vendor/now-sdk-explain.md`, `vendor/now-sdk-setup.md`) in favor of a link
  to the upstream `now-sdk` skill at ServiceNow/sdk v4.14.0.
- Updated package metadata, the root `SKILL.md`, and README for the 2.5.0
  release and the MCP v6.1 contract.
- `npm test` runs Jest in band, matching CI.

### Fixed

- Package verification and the migration shim test accept the npm 12
  `npm pack --json` shape (results keyed by package name) as well as the
  npm 10/11 array.
- Local `npm test` no longer races: the CLI validation fixture temporarily
  adds a category under `skills/`, which parallel workers could discover.

## 2.4.0 - 2026-07-28

### Added

- Four skills for task summarization, document screening, risk identification,
  and supplier lifecycle operations, bringing the catalog to 184 skills across
  23 categories.
- A canonical packaged root `SKILL.md` for catalog discovery.
- CI and clean packed-consumer release gates.

### Changed

- Aligned catalog guidance with the versioned Happy Platform MCP v5.1 contract:
  exactly 55 live tools and six docs-only tools.
- Made registry refreshes concurrent-safe, retryable, and atomic.
- Made prompt rendering preserve the complete authored skill body.
- Updated package metadata, documentation, and migration compatibility for the
  2.4.0 release.
- Prepared `happy-servicenow-skills@1.2.1` as a separate final compatibility
  release for the repaired loader export and legacy CLI forwarding, with a
  `happy-platform-skills@^2.4.0` compatibility floor.

### Fixed

- Removed stale and phantom README catalog entries and counts.
- Repaired the deprecated `happy-servicenow-skills` loader and CLI forwarding.
- Strengthened package verification to compare exact source, tarball, and
  clean-consumer skill path sets.
