---
name: script-sync
version: 1.1.1
description: Explicit pull, local edit, freshness check, and push workflow for ServiceNow scripts with Happy Platform MCP 6.1
author: Happy Technologies LLC
tags: [admin, development, git, local-development, scripts, version-control]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
  rest:
    - /api/now/table/sys_script
    - /api/now/table/sys_script_include
    - /api/now/table/sys_ui_script
    - /api/now/table/sys_script_client
  native: [Read, Write, Git]
complexity: intermediate
estimated_time: 15-30 minutes
---

# Script Pull, Edit, and Push Workflow

## Overview

Happy Platform MCP 6.1 has no automatic script synchronization or watch tool.
Use this explicit workflow to pull the current record, edit a local copy, check
that the remote record has not changed, and push the intended script field with
`SN-Update-Record`.

This workflow favors reviewable changes and conflict detection over background
automation. It works for Business Rules, Script Includes, Client Scripts, UI
Scripts, UI Actions, Scheduled Jobs, and other records whose script is stored in
a table field.

## Prerequisites

- Read and write access to the target script table
- The target ServiceNow instance name
- A local directory outside the installed npm package
- Git or another local version-control system
- The table name, record `sys_id`, and script field name
- The correct application scope and update set selected before any push

## Procedure

### 1. Discover the record

Use a bounded query with explicit fields. Always route the request to the
intended instance.

```text
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: name=IncidentUtils
  fields: sys_id,name,script,sys_updated_on,sys_mod_count,sys_scope
  limit: 5
  instance: dev
```

Stop if the query is ambiguous. Select one `sys_id`; do not update multiple
same-named scripts by assumption.

### 2. Pull the authoritative record

```text
Tool: SN-Get-Record
Parameters:
  table_name: sys_script_include
  sys_id: <script_sys_id>
  fields: sys_id,name,script,sys_updated_on,sys_mod_count,sys_scope
  instance: dev
```

Write only the returned `script` value to a local `.js` file. In adjacent local
metadata, record the table, `sys_id`, instance, `sys_updated_on`, and
`sys_mod_count` from this pull. Do not put ServiceNow credentials in the file or
repository.

Example layout:

```text
scripts/servicenow/script_includes/IncidentUtils.js
scripts/servicenow/script_includes/IncidentUtils.metadata.json
```

### 3. Edit and review locally

Edit the JavaScript in the IDE, run applicable static checks or tests, and
inspect the Git diff. Keep the change scoped to the script field you intend to
deploy.

### 4. Check remote freshness before pushing

Immediately before updating, retrieve the record again:

```text
Tool: SN-Get-Record
Parameters:
  table_name: sys_script_include
  sys_id: <script_sys_id>
  fields: sys_id,script,sys_updated_on,sys_mod_count
  instance: dev
```

Compare both `sys_updated_on` and `sys_mod_count` with the saved pull metadata.
Also compare the returned script with the original local base. If any value has
changed, stop: pull the new version, review the remote changes, and merge them
locally. Never overwrite a fresher remote edit automatically.

### 5. Push the reviewed script field

After the freshness check passes, update only the intended field:

```text
Tool: SN-Update-Record
Parameters:
  table_name: sys_script_include
  sys_id: <script_sys_id>
  data:
    script: <reviewed_local_script>
  instance: dev
```

Do not use a background script for this normal record update. The generic MCP
update is the primary operation and preserves per-call instance routing.

### 6. Verify the push

Read the record again with `SN-Get-Record`. Confirm that the remote `script`
matches the reviewed local content and record the new `sys_updated_on` and
`sys_mod_count`. Then verify the associated `sys_update_xml` capture in the
current update set with a bounded `SN-Query-Table` query.

### 7. Repeat explicitly for later edits

There is no watch mode in Happy Platform MCP 6.1. For each change, repeat the
freshness check, update, and verification. A local file watcher may run linting
or tests, but it must not push ServiceNow changes without the explicit conflict
check and update sequence above.

## Supported Record Patterns

| Script type | Table | Common script field |
|---|---|---|
| Business Rule | `sys_script` | `script` |
| Script Include | `sys_script_include` | `script` |
| Client Script | `sys_script_client` | `script` |
| UI Script | `sys_ui_script` | `script` |
| UI Action | `sys_ui_action` | `script` |
| Scheduled Job | `sysauto_script` | `script` |
| Fix Script | `sys_script_fix` | `script` |

Confirm unfamiliar table and field names with `SN-Get-Table-Schema` before
adapting this workflow.

## Best Practices

- Set the application scope and update set before pushing configuration.
- Use explicit `instance` on every live record call, especially in concurrent
  work or critical environments.
- Pull immediately before editing and check freshness immediately before push.
- Limit field selection to the script and concurrency metadata you need.
- Keep the original pulled version until verification succeeds.
- Commit local changes only after reviewing the diff and remote verification.
- Never store instance credentials or access tokens with local script files.

## Troubleshooting

### The remote record changed after the pull

Do not push. Save the local edits, retrieve the new remote script, and perform a
three-way merge using the original pull as the base. Re-run the freshness check
after resolving the merge.

### The update succeeded but no update-set record appears

Confirm the correct application scope and current update set, then inspect
`sys_update_xml`. Do not retry blindly: first determine whether the table or
field is update-set captured.

### The local and remote scripts differ after update

Retrieve the record again and compare exact content. Check whether a business
rule, formatter, or scoped-app policy transformed the value. Treat the remote
record as authoritative until the discrepancy is understood.

### Continuous synchronization is required

Happy Platform MCP 6.1 does not provide automatic pull, push, or watch tools.
Keep the explicit workflow, or build a separately reviewed deployment pipeline
with equivalent freshness and verification gates.

## Related Skills

- `admin/update-set-management`
- `development/business-rules`
- `development/script-includes`
