---
name: instance-management
version: 1.1.2
description: Manage and safely route Happy Platform MCP v6.1 operations across ServiceNow instances
author: Happy Technologies LLC
tags: [admin, instance, multi-instance, environment, configuration]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  mcp: [SN-Set-Instance, SN-Get-Current-Instance, SN-Query-Table, SN-Create-Record, SN-Update-Record]
  cli:
    - happy-platform-mcp instance list
    - happy-platform-mcp instance test
  native: [Bash, Read]
complexity: intermediate
estimated_time: 5-10 minutes
---

# Instance Management

## Overview

Happy Platform MCP v6.1 separates persistent registration from runtime routing. Local CLI commands manage a metadata-only user registry and keychain-backed credentials. MCP tools select a target for the current session or for one explicit call. This separation prevents one workflow from accidentally redirecting another.

## Prerequisites

- Happy Platform MCP v6.1 configured through `development/mcp-server-installation`
- One or more instances added with the local interactive CLI
- Appropriate ServiceNow roles for the intended read or write

## Procedure

### Step 1: Inspect Registered Instances

For local configuration inspection, prefer:

```bash
happy-platform-mcp instance list
happy-platform-mcp instance test dev
```

From MCP, call parameterless `SN-Set-Instance` to list the configured choices without changing the target:

```text
Tool: SN-Set-Instance
Parameters: none
```

There is no separate MCP list tool in v6.1; parameterless `SN-Set-Instance` is the supported listing operation.

### Step 2: Confirm the Session Target

```text
Tool: SN-Get-Current-Instance
Parameters: none
```

This reports the current session's implicit target. Check it immediately before a sequential write workflow.

### Step 3: Select a Target for Sequential Work

```text
Tool: SN-Set-Instance
Parameters:
  instance_name: dev
```

`SN-Set-Instance` changes only the current session's implicit target in memory. It does not edit the registry, alter another MCP session, or change the configured startup default. A new session starts from its configured default.

### Step 4: Route Concurrent or Critical Calls Explicitly

Every live ServiceNow operation accepts an optional `instance` parameter except `SN-Register-Instance`, `SN-Set-Instance`, `SN-Get-Current-Instance`, and the documentation tools (`SN-Docs-Families`, `SN-Docs-Status`, `SN-Docs-Sync`, `SN-Docs-Search`, and `SN-Docs-Get`). Registration accepts no `instance` field. An explicit per-call value on supported operations does not mutate the session target.

```text
Tool: SN-Query-Table
Parameters:
  instance: prod
  table_name: incident
  query: active=true^priority=1
  fields: number,short_description,state
  limit: 10
```

Use explicit `instance` routing for concurrent work, critical operations, production changes, or calls that could race with `SN-Set-Instance`. Concurrent calls against one stable implicit target can omit it, but explicit routing is easier to audit.

### Step 5: Verify Before a Write

Query an instance-specific property using an explicit target, compare the response with the intended environment, and only then write:

```text
Tool: SN-Query-Table
Parameters:
  instance: dev
  table_name: sys_properties
  query: name=instance_name^ORname=glide.installation.name
  fields: name,value
  limit: 5
```

Then preserve the same explicit target on the mutation:

```text
Tool: SN-Update-Record
Parameters:
  instance: dev
  table_name: incident
  sys_id: <verified-record-sys-id>
  data:
    work_notes: Verified dev routing before update
```

## Tool Usage

| Tool | Purpose |
|---|---|
| `SN-Set-Instance` | With no parameters, list choices; with `instance_name`, change the sequential session target |
| `SN-Get-Current-Instance` | Report the current session target |
| `SN-Query-Table` | Verify or read from an explicit named instance |
| `SN-Create-Record` | Create on an explicitly verified target |
| `SN-Update-Record` | Update on an explicitly verified target |

Persistent additions, removals, metadata updates, tests, migrations, and credential rotation belong to the local CLI. MCP calls must not collect credential material or modify keychain entries.

## Best Practices

- Prefer explicit per-call routing for all production writes.
- Pair every critical mutation with a same-target read-only verification.
- Use `SN-Set-Instance` only for sequential convenience, never as a parallel isolation mechanism.
- Keep development as the configured default when operational policy permits.
- Run `happy-platform-mcp instance test <name>` locally when connectivity changes.
- Keep raw REST as a last resort and rely only on a pre-existing local credential helper.

## Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Instance is not listed | It is not in the user registry | Run `happy-platform-mcp instance add` locally |
| Current target is unexpected | A prior sequential switch changed this session | Call `SN-Get-Current-Instance`, then `SN-Set-Instance` with the intended name |
| Parallel work reaches the wrong target | Calls relied on mutable session state | Add explicit `instance` to each overlapping call |
| A new registration is not live | Server started in docs-only mode | Restart the MCP host after registration |
| Connectivity test fails | Local registration or ServiceNow access is invalid | Run the local `instance test` flow; never send credentials through MCP |

## Related Skills

- `development/mcp-server-installation` - Secure local registration and migration
- `admin/generic-crud-operations` - Table operations after routing
- `admin/update-set-management` - Environment-specific configuration transport
