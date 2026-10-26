---
name: mcp-server-installation
version: 1.2.0
description: Install Happy Platform MCP v6.1 and configure secure, keychain-backed ServiceNow instance access
author: Happy Technologies LLC
tags: [development, mcp, installation, servicenow, configuration, authentication]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  mcp: [SN-Register-Instance, SN-Set-Instance, SN-Get-Current-Instance, SN-Query-Table, SN-Natural-Language-Search]
  cli:
    - happy-platform-mcp instance add
    - happy-platform-mcp instance list
    - happy-platform-mcp instance update
    - happy-platform-mcp instance remove
    - happy-platform-mcp instance test
    - happy-platform-mcp instance migrate
  native: [Bash, Read]
complexity: intermediate
estimated_time: 10-30 minutes
---

# Happy Platform MCP v6.1 Installation

## Overview

Install Happy Platform MCP v6.1, register one or more ServiceNow instances, and connect an MCP host without exposing authentication material to the model, MCP messages, logs, shell history, or client JSON. Keep the MCP-first policy: use live `SN-*` tools for ServiceNow work after local setup; use raw REST only when no MCP tool can perform the operation and the caller already has a locally managed credential helper.

## Prerequisites

- Node.js >= 20
- Happy Platform MCP `6.1.0` or a compatible later 6.x release
- A local interactive terminal for masked prompts
- An OS keychain available to the current user
- An MCP-capable client and appropriate ServiceNow access

## Procedure

### Step 1: Install the Server

Use npm for a normal installation:

```bash
npm install -g happy-platform-mcp@6.1.0
happy-platform-mcp --version
```

An MCP host can instead launch the package with `npx -y happy-platform-mcp@6.1.0`. Do not add authentication material to its arguments or environment block.

The `happy-platform-mcp` command serves the stdio transport, which needs no HTTP token. Since 6.0, the HTTP/SSE transport (a source checkout's `npm start` or the Docker image) refuses to start unless `HAPPY_MCP_API_TOKEN` in the server environment holds 64 hex characters generated with `openssl rand -hex 32` (or 43 base64url characters). Every HTTP client, probe, and health check must send that value as a bearer token in the `Authorization` header, and `HAPPY_MCP_ALLOWED_HOSTS` must list the host authority clients use behind a container port or proxy. Keep the token in a secret store, never in client JSON, prompts, or documentation. HTTP serves one trusted operator; shared multi-user hosting is unsupported.

When upgrading from 5.x, each public `authorization_code` instance prompts for browser sign-in once, because refresh tokens are now bound to the OAuth identity. If an instance uses an external identity provider, list its origin in `SERVICENOW_OAUTH_TRUSTED_ORIGINS` for both the server and the `happy-platform-mcp instance` CLI.

### Step 2: Choose an Authentication Mode

Run `happy-platform-mcp instance add` locally. It gathers required values through interactive masked prompts and puts credential material in the OS keychain. The model must never ask the user to paste, echo, log, document, or send that material in an MCP call.

| Mode | Choose when | Local setup behavior |
|---|---|---|
| Basic | A named integration user is required | Prompts locally for the user identity and its credential |
| OAuth `client_credentials` | A non-interactive service integration is required | Prompts locally for client metadata and the client credential |
| OAuth password | A legacy resource-owner flow is explicitly required | Prompts locally for user and client credentials; prefer a stronger flow when possible |
| Public `authorization_code` with PKCE | Per-user browser sign-in is available | Direct zero-static-secret path; the browser flow stores refresh state in the OS keychain |

Use the local CLI lifecycle:

```bash
happy-platform-mcp instance add
happy-platform-mcp instance list
happy-platform-mcp instance test dev
happy-platform-mcp instance update dev
happy-platform-mcp instance remove dev
happy-platform-mcp instance migrate
```

`instance update` changes metadata only. Authentication changes require remove then re-add. Use `happy-platform-mcp instance credential set dev` only to rotate an already-registered instance or complete an existing metadata-only registration; it cannot bootstrap a new instance name.

### Step 3: Understand Registry Storage

The default version 1 user registry is `~/.config/happy-platform-mcp/instances.json`. It contains non-secret metadata and canonical `credentialRef` values only. Credentials remain in the OS keychain. Do not manually add plaintext values to the registry.

`HAPPY_CONFIG_PATH` overrides the registry location and supports absolute paths, relative paths, and `~`. Set it before running the CLI and provide the same value to the MCP host. This is safe host configuration because it identifies metadata, not a credential.

```json
{
  "mcpServers": {
    "happy-platform-mcp": {
      "command": "npx",
      "args": ["-y", "happy-platform-mcp@6.1.0"],
      "env": {
        "HAPPY_CONFIG_PATH": "~/.config/happy-platform-mcp/instances.json"
      }
    }
  }
}
```

The package-local `config/servicenow-instances.json` is a read-only legacy migration input, never the writable user registry. With the automatic package-legacy-to-user-registry path, `happy-platform-mcp instance migrate` moves credentials into the OS keychain and leaves the legacy source untouched. If an override points at the same plaintext source and destination, migration refuses before writing; select a distinct target or recreate each instance with `instance add`. Never teach manual plaintext registry editing.

### Step 4: Start Normally or in Docs-Only Mode

When neither a registry/config nor legacy environment credentials exist, stdio automatically falls back to docs-only mode. To force that mode explicitly, configure:

```json
{
  "env": {
    "HAPPY_MCP_DOCS_ONLY": "true"
  }
}
```

Use `HAPPY_MCP_DOCS_ONLY=true`; the `--docs-only` argument does not force docs-only mode in 6.1.0 and does not override an existing registry. Docs-only mode exposes the documentation and safe registration tools without creating a live ServiceNow client.

### Step 5: Use Safe MCP Registration

`SN-Register-Instance` is metadata-only and rejects secret fields. It normally persists metadata and performs a live reload. A server that started in docs-only mode must restart before live ServiceNow tools become available.

There is a 6.1.0 bootstrap constraint: credential-backed registration checks for credential references before it writes new metadata, while `instance credential set` requires an already-registered name. Therefore:

- Use local `instance add` for Basic, `client_credentials`, and OAuth password.
- Direct `SN-Register-Instance` is reliable for public `authorization_code`, which has no static client credential.
- Credential-backed direct registration is also possible with externally preprovisioned deterministic keychain refs.
- Never pass a credential or token to `SN-Register-Instance`.

Example public registration:

```text
Tool: SN-Register-Instance
Parameters:
  name: public-dev
  url: https://example.service-now.com
  authType: oauth
  grantType: authorization_code
  clientId: registered-public-client-id
  makeDefault: true
```

### Step 6: Verify and Route

After restarting the MCP host, list instances with parameterless `SN-Set-Instance`, inspect the session with `SN-Get-Current-Instance`, and run a low-risk read:

```text
Tool: SN-Query-Table
Parameters:
  instance: dev
  table_name: incident
  query: active=true
  fields: number,short_description,state
  limit: 1
```

`SN-Set-Instance` changes the current session's implicit target for sequential work. For concurrent work, critical operations, or any operation that could race a session switch, pass the explicit per-call `instance` value.

## Best Practices

- Start read-only and in a non-production instance.
- Keep instance names clear and verify the current target before writes.
- Keep credentials inside masked local prompts and the OS keychain.
- Use explicit routing for destructive, production, concurrent, or critical operations.
- Run `happy-platform-mcp instance test <name>` before enabling write workflows.
- Preserve the MCP-first policy and use `SN-Get-Table-Schema` before unfamiliar table operations.

## Troubleshooting

| Issue | Resolution |
|---|---|
| CLI reports an old Node runtime | Install Node 20 or later and repeat the command |
| An instance name is missing | Run `happy-platform-mcp instance list`, then use `instance add` locally |
| Authentication mode must change | Run `instance remove <name>`, then `instance add` and choose the new mode |
| Metadata exists but authentication fails | Run `instance credential set <name>` locally, then `instance test <name>` |
| Only docs tools appear | Remove forced docs-only mode if present and restart after a usable registration exists |
| Migration refuses the path | Use the automatic legacy-to-default-user path or select a distinct metadata-only target |
| HTTP/SSE server will not start or rejects requests | Set a generated `HAPPY_MCP_API_TOKEN` on the server, send it as a bearer token from every client and health check, and list the client host authority in `HAPPY_MCP_ALLOWED_HOSTS` |
| Authorization-code instance asks to sign in again after upgrading | Expected once after moving from 5.x; complete the browser sign-in |

## Related Skills

- `admin/instance-management` - Runtime routing and environment safety
- `development/servicenow-docs-mcp` - Documentation search and docs-only behavior
- `development/mcp-server` - Build a custom MCP-compatible integration
