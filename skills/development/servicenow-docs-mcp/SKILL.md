---
name: servicenow-docs-mcp
version: 1.0.2
description: Add or maintain ServiceNowDocs search capabilities in Happy Platform MCP, including live GitHub lookup, optional local SQLite FTS indexing, and optional vector search
author: Happy Technologies LLC
tags: [development, mcp, servicenow-docs, documentation, search, sqlite, fts, vector, github, rag]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Register-Instance
    - SN-Docs-Families
    - SN-Docs-Get
    - SN-Docs-Search
    - SN-Docs-Sync
    - SN-Docs-Status
  cli:
    - npm test
    - npm audit
    - docker build
  native:
    - Bash
    - Read
    - Write
complexity: advanced
estimated_time: 30-90 minutes
---

# ServiceNowDocs MCP Search

## Overview

This skill covers adding and maintaining ServiceNow documentation search in Happy Platform MCP using the public `ServiceNow/ServiceNowDocs` GitHub repository.

Use it when a user asks to:

- Add ServiceNow documentation lookup to Happy Platform MCP
- Sync, cache, or localize ServiceNowDocs content
- Search ServiceNow docs from MCP tools
- Add SQLite FTS5, sqlite-vec, embeddings, or vector search to the MCP docs capability
- Troubleshoot the five documentation tools
- Decide between QMD, GitHub search, SQLite FTS, or vector indexing for ServiceNow docs

For installing the MCP server itself, use `development/mcp-server-installation`. For general MCP server design, use `development/mcp-server`.

## Prerequisites

- Happy Platform MCP source checkout
- Node.js >= 20
- Network access to `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs` for live mode or sync
- Optional `better-sqlite3` support only when local indexing is enabled
- Optional embedding provider only when vector search is enabled

### v6.1 Docs-Only Bootstrap

When no registry/config and no legacy environment credentials are present, the stdio server automatically falls back to docs-only mode. Force this mode with `HAPPY_MCP_DOCS_ONLY=true`. The 6.1.0 `--docs-only` argument does not force docs-only mode, does not override a registry that already exists, and must not be used for this workflow.

Docs-only mode exposes `SN-Docs-Families`, `SN-Docs-Status`, `SN-Docs-Sync`,
`SN-Docs-Search`, and `SN-Docs-Get`, plus `SN-Register-Instance`.
`SN-Register-Instance` is metadata-only and rejects secret fields. A normal live server reloads the registry after a successful registration; restart a docs-only process before expecting live ServiceNow tools.

Credential-backed bootstrap has a 6.1.0 ordering constraint: registration expects a credential reference, but the local credential-set command expects the instance name to exist. Use local interactive `happy-platform-mcp instance add` for Basic, OAuth `client_credentials`, and OAuth password registrations. Direct registration is reliable for public `authorization_code`, or when an administrator has created externally preprovisioned deterministic keychain refs. Never ask a user or agent to put credential material in the tool call.

### Upgrading Docs Settings from 5.x

Since 6.0, docs requests are unauthenticated and fetch only from `raw.githubusercontent.com/ServiceNow/ServiceNowDocs`, without following redirects, and accept only families and branches listed in its `main/llms.txt`. Remove `GITHUB_TOKEN` and `docs.githubToken` settings; authenticated docs retrieval is not supported. Existing local docs caches are discarded on first open, so re-run `SN-Docs-Sync` for each family you need offline.

## Procedure

### Step 1: Keep Live GitHub Lookup as the Default

The default docs mode should not require local storage, SQLite, embeddings, or QMD. Agents should be able to list docs families and fetch raw docs directly from GitHub using `SN-Docs-Families` and `SN-Docs-Get`.

Default behavior:

```text
localIndexEnabled: false
enableVector: false
embeddingProvider: none
```

Use live GitHub access for:

- First-run experience
- Lightweight installs through `npx happy-platform-mcp`
- Docker images without persistent volumes
- Users who only need exact document retrieval

### Step 2: Make Local SQLite FTS Optional

Use SQLite FTS5 for offline or faster text search, but never make SQLite a startup requirement.

Implementation rules:

- Put SQLite packages such as `better-sqlite3` in optional dependencies.
- Load SQLite lazily from the docs store module.
- If SQLite is unavailable and local indexing is disabled, startup must still succeed.
- If local indexing is requested and SQLite is unavailable, return a clear setup message from the docs tools.
- Store local index files in a configurable cache directory, not inside the repo by default.

Recommended config shape:

```json
{
  "docs": {
    "localIndexEnabled": false,
    "cacheDir": "~/.happy-platform-mcp/docs/servicenow",
    "enableVector": false,
    "embeddingProvider": "none"
  }
}
```

Recommended environment variables:

```bash
HAPPY_DOCS_ENABLE_LOCAL_INDEX=false
HAPPY_DOCS_CACHE_DIR=
HAPPY_DOCS_ENABLE_VECTOR=false
HAPPY_DOCS_EMBEDDING_PROVIDER=none
```

### Step 3: Treat Vector Search as Provider-Gated

Vector search is useful for semantic lookup, but it should be opt-in and provider-gated.

Use this pattern:

- Keep `enableVector` false by default.
- Support a no-op vector adapter when no provider is configured.
- Require an explicit embedding provider and credentials before generating embeddings.
- Keep FTS search usable without embeddings.
- Avoid silently calling hosted embedding APIs from a default install.

### Step 4: Avoid QMD in Product Runtime

QMD can be useful for personal experimentation or offline training workflows, but it should not be required by Happy Platform MCP.

Prefer:

- Raw GitHub content from the pinned `ServiceNow/ServiceNowDocs` origin for live reads
- SQLite FTS5 for optional local keyword search
- sqlite-vec or a compatible vector adapter for optional semantic search
- Simple chunking for markdown sections and headings

Do not add a mandatory QMD dependency to product startup, Docker images, or npm install.

### Step 5: Expose MCP Tools with Graceful Degradation

Docs tools should report capability state instead of failing mysteriously.

Expected tool behavior:

| Tool | Local Index Disabled | Local Index Enabled |
|------|----------------------|---------------------|
| `SN-Docs-Families` | List families from GitHub | List families from GitHub or cache |
| `SN-Docs-Get` | Fetch raw doc from GitHub | Fetch raw doc from GitHub or cache |
| `SN-Docs-Search` | Return setup hint | Search SQLite FTS index |
| `SN-Docs-Sync` | Return setup hint | Sync GitHub docs into SQLite |
| `SN-Docs-Status` | Report disabled index | Report DB, sync, and vector status |

### Step 6: Verify Optionality

Before shipping, verify both online and offline-adjacent paths:

```bash
npm test
docker build .
```

Also run a no-SQLite smoke check by temporarily removing or hiding `better-sqlite3` from `node_modules` and confirming that:

- MCP server startup still succeeds
- `SN-Docs-Families` works
- `SN-Docs-Get` works
- `SN-Docs-Status` reports SQLite availability accurately
- `SN-Docs-Search` returns an enable-local-index hint instead of crashing

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Docs-Families` | List available ServiceNow docs families | Discovery and choosing a docs branch/family |
| `SN-Docs-Get` | Fetch a specific docs markdown file | Direct citation or inspection |
| `SN-Docs-Search` | Search local FTS docs chunks | Offline or faster text search |
| `SN-Docs-Sync` | Build or refresh the local docs index | User explicitly enables local docs |
| `SN-Docs-Status` | Inspect docs config and capability state | Troubleshooting setup |

## Best Practices

1. Keep the first-run MCP experience live and lightweight.
2. Make offline/local docs an explicit user choice.
3. Put MCP runtime properties in local env/config, not ServiceNow `sys_properties`.
4. Do not commit generated SQLite databases or synced docs caches.
5. Chunk markdown by headings so search results point agents toward useful sections.
6. Return source metadata such as family, path, heading, and GitHub URL with search results.
7. Keep vector search additive; FTS should remain the dependable baseline.
8. Include tests for disabled, missing-dependency, and enabled-index states.

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Docs tools crash on startup | SQLite loaded eagerly | Lazy-load SQLite only when local index is enabled |
| `SN-Docs-Search` returns setup hint | Local index is disabled | Enable `HAPPY_DOCS_ENABLE_LOCAL_INDEX=true` or use live `SN-Docs-Get` |
| Sync fails against GitHub | Rate limit, network issue, or a family/branch not listed in `main/llms.txt` | Retry later and pick a family from `SN-Docs-Families`; do not add a GitHub token, which 6.x does not send |
| Docker image grows unexpectedly | Synced docs or DB copied into image | Keep cache paths outside repo and add generated files to ignore rules |
| Embedding calls happen unexpectedly | Vector provider enabled by default | Default provider to `none` and require explicit opt-in |

## Related Skills

- `development/mcp-server` - General MCP server design
- `development/mcp-server-installation` - Happy Platform MCP installation
- `genai/ai-search-rag` - ServiceNow AI Search and RAG configuration
- `development/debugging-techniques` - Troubleshooting ServiceNow and integration issues
