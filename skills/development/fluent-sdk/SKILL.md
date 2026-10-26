---
name: fluent-sdk
version: 1.1.0
description: Hybrid ServiceNow development using the three-tier approach - NowSDK Fluent for metadata-as-code, MCP REST for runtime operations, and fix scripts as manual fallback
author: Happy Technologies LLC
tags: [development, nowsdk, fluent, flows, scoped-apps, metadata-as-code, deployment, catalog, tables, business-rules]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Execute-Background-Script
    - SN-Create-Fix-Script
    - SN-Set-Current-Application
    - SN-Set-Update-Set
    - SN-Get-Current-Update-Set
    - SN-Inspect-Update-Set
    - SN-Run-ATF-Test
    - SN-Run-ATF-Suite
    - SN-Get-CICD-Progress
  cli:
    - now-sdk auth
    - now-sdk build
    - now-sdk install
    - now-sdk explain
    - now-sdk query
    - now-sdk exec
    - now-sdk cicd
  native:
    - Bash
    - Read
    - Write
complexity: expert
estimated_time: 30-90 minutes
---

# Hybrid ServiceNow Development with NowSDK Fluent

## Overview

This skill implements a **three-tier development strategy** for ServiceNow, routing each operation to the most capable tool:

```
TIER 1: NowSDK Fluent (metadata-as-code)
  Flows, tables, business rules, catalog items, ACLs, scoped apps
  TypeScript → build → install as scoped application
  ↓ falls through when...
  - Runtime data operations needed
  - Live instance queries required
  - Existing record manipulation

TIER 2: MCP REST Tools (runtime operations)
  CRUD on live data, queries, update set management, background scripts
  Direct REST API calls to instance
  ↓ falls through when...
  - REST API has documented limitations
  - UI-only operations (Flow compilation, UI Policy action linking)
  - Complex server-side operations not exposed via REST

TIER 3: Fix Scripts (manual fallback)
  SN-Create-Fix-Script for operations neither tier can handle
  Generated scripts for manual execution in instance
  Used for: Flow compilation, UI Policy setValue(), complex GlideRecord ops
```

**When to use this skill:**
- "Build a new flow for incident escalation"
- "Create a scoped app with tables and business rules"
- "Set up a catalog item with approval workflow"
- "Deploy metadata changes with version control"
- "I need a flow but REST can't create flows"

## Foundation: ServiceNow's now-sdk Agent Skill

ServiceNow publishes its own agent skill for Fluent work: [`now-sdk`](https://github.com/ServiceNow/sdk/blob/v4.14.0/skills/now-sdk/SKILL.md) in the ServiceNow/sdk repository. This skill does not bundle it. Install it next to this one so the agent picks it up in any folder that has a `now.config.json`. The repository README lists the install command for each agent (Claude Code plugin, Codex, Cursor, GitHub Copilot via `gh skill install`). This skill decides which tier handles an operation; the upstream skill covers project orientation and documentation lookup.

Either way, the installed SDK is the source of truth for Fluent APIs. `now-sdk explain` reads docs that ship with the exact SDK version in the project:
1. `npx @servicenow/sdk explain <search-term> --list --format=raw` — find relevant topics
2. `npx @servicenow/sdk explain <topic> --peek --format=raw` — check the summary before reading
3. `npx @servicenow/sdk explain <topic> --format=raw` — read the full topic
4. `npx @servicenow/sdk <subcommand> --help` before first use of any subcommand — do not guess flags

Do this before writing any Fluent code; code examples in this skill can lag behind SDK releases.

## Prerequisites

- **Node.js:** v20.18+ (`node --version`; the `engines` minimum of `@servicenow/sdk` 4.14.0)
- **NowSDK:** v4.14.0+ (`npm install -g @servicenow/sdk@latest`)
- **Instance:** ServiceNow SDK plugin enabled, user has `admin` or `sn_sdk.user` role
- **MCP Server:** happy-platform-mcp 6.1.0+ configured and connected
- **Auth:** `now-sdk auth` completed for target instance
- **ATF (optional):** CI/CD REST API plugin (`com.glide.continuousdelivery`), role `sn_cicd.sys_ci_automation` or `admin`, and `sn_atf.runner.enabled=true` (false by default on PDIs)
- **Related Skills:** `development/mcp-server` for MCP tool reference; ServiceNow's upstream `now-sdk` skill (see Foundation) for Fluent orientation

## Tier Decision Matrix

Use this matrix to determine which tier handles each operation:

| Operation | Tier 1 (Fluent) | Tier 2 (MCP REST) | Tier 3 (Fix Script) |
|-----------|-----------------|--------------------|--------------------|
| **Create flow with logic** | YES - full Flow DSL | No - cannot create flows | No |
| **Compile/publish flow** | Automatic on install (unless `--skip-flow-activation`) | No | Only if activation was skipped or failed - manual in UI |
| **Create table + schema** | YES - `Table()` with typed columns | Yes - but no version control | No |
| **Business rules** | YES - `BusinessRule()` with scripts | Yes - `SN-Create-Record` on sys_script | No |
| **Catalog items** | YES - `CatalogItem()` with variables | Yes - but UI policies limited | Partial |
| **UI Policy actions** | YES - deployed with app | No - REST can't link actions | YES - `setValue()` script |
| **ACLs** | YES - `Acl()` definition | Yes - `SN-Create-Record` on sys_security_acl | No |
| **Script includes** | YES - with server modules | Yes - `SN-Create-Record` on sys_script_include | No |
| **Query live data** | No - not for runtime | YES - `SN-Query-Table` (or `now-sdk query`) | No |
| **Update existing records** | No - creates new metadata | YES - `SN-Update-Record` | No |
| **Update set management** | Automatic on install | YES - `SN-Set-Update-Set`, inspect, move | No |
| **Background script execution** | No | YES - `SN-Execute-Background-Script` (or `now-sdk exec`) | No |
| **Scoped app creation** | YES - `now.config.json` defines scope | Yes - `SN-Create-Record` on sys_app | No |
| **Deploy to instance** | YES - `now-sdk install` | No - records created individually | No |
| **ATF tests** | YES - `Test()`, `TestSuite()`; run in CI with `now-sdk cicd` | YES - `SN-Run-ATF-Test`, `SN-Run-ATF-Suite` | No |
| **Complex GlideRecord ops** | No | Partial | YES - full server-side API |

### NowSDK CLI or MCP Tool

Several runtime operations exist both as `now-sdk` subcommands and as MCP tools. Pick by where you are working, not by capability:

| Need | NowSDK CLI | MCP tool | Use |
|------|------------|----------|-----|
| Run a server script | `now-sdk exec` (`--reason`, `--scope`, `--file`) | `SN-Execute-Background-Script` (`description`, `scope`) | Same `/sys.scripts.do` processor as the authenticated user; both record a rollback context by default (only when records change). `exec` defaults to the project's scope; use it from a terminal or project. Use the MCP tool from an agent session. Get the user's approval for every run of either. |
| Read records | `now-sdk query <table> -q '<encoded query>' -o json` | `SN-Query-Table` | Both read-only Table API. Prefer either over a script. |
| Run ATF | `now-sdk cicd test run`, `cicd testsuite run`, `cicd test logs` | `SN-Run-ATF-Test`, `SN-Run-ATF-Suite`, then `SN-Get-CICD-Progress` | CLI in CI pipelines (non-zero exit gates the build). MCP tools for interactive runs; on `status: "timeout"` continue with `SN-Get-CICD-Progress`, never re-run. |
| Promote an app | `now-sdk cicd publish`, `cicd install`, `cicd rollback` (Application Repository) | None | Promote a published version across instances instead of `now-sdk install` to production. |

## Procedure

### Step 1: Environment Setup

Verify NowSDK is installed and working:

```bash
# Check Node version (must be 20.18+)
node --version

# Check SDK version (must be 4.14.0+)
npx @servicenow/sdk --version

# If not installed or outdated:
npm install -g @servicenow/sdk@latest

# Authenticate to your instance
now-sdk auth --add <instance-url> --type basic
# Follow prompts: alias, credentials
```

**Credential storage (4.14.0+):** profiles live in an AES-256-GCM `~/.now-sdk/credentials.enc` (override the directory with `SN_SDK_CREDENTIALS_DIR`); only the encryption key is in the OS keychain. Existing keychain profiles migrate automatically on first use. The file is not portable between machines, so never copy it into CI; pipelines authenticate with environment credentials (`SN_SDK_NODE_ENV=SN_SDK_CI_INSTALL` plus `SN_SDK_INSTANCE_URL` and OAuth client or user credentials — see `npx @servicenow/sdk explain ci-integration --format=raw`).

**Verify with explain command:**
```bash
npx @servicenow/sdk explain quickstart --list --format=raw
```

**Then familiarize yourself** with the Fluent API for whatever you're about to build:
```bash
# Example: about to create flows
npx @servicenow/sdk explain Flow --list --peek --format=raw
npx @servicenow/sdk explain Flow --format=raw
```

### Step 2: Determine the Right Tier

Before writing any code, classify the request:

**Route to Tier 1 (Fluent) when:**
- Creating new metadata from scratch (flows, tables, business rules, catalog items)
- Building a scoped application
- Need version-controlled, reproducible deployments
- Flow Designer operations (REST API cannot create flows)
- Complex catalog items with variable sets, pricing, access controls

**Route to Tier 2 (MCP REST) when:**
- Querying or modifying live data
- Managing update sets (inspect, move, clone)
- One-off record updates on existing records
- Running background scripts
- Verifying Tier 1 deployments

**Route to Tier 3 (Fix Script) when:**
- Flow activation that `now-sdk install` skipped or failed (manual in UI)
- UI Policy action linking via `setValue()`
- Complex GlideRecord operations not exposed via REST
- Bulk data operations requiring server-side performance

### Step 3: Scaffold a Fluent Project (Tier 1)

Create the project structure for a new scoped application.

**Project Structure:**
```
my-sn-app/
├── now.config.json          # Scope and instance config
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config (optional)
├── src/
│   └── fluent/
│       ├── generated/
│       │   └── keys.ts      # Auto-generated sys_id mappings
│       ├── tables.now.ts    # Table definitions
│       ├── rules.now.ts     # Business rules
│       ├── flows.now.ts     # Flow definitions
│       ├── catalog.now.ts   # Catalog items
│       ├── acls.now.ts      # Access controls
│       └── *.server.js      # External script files
└── src/
    └── server/              # Server-side TypeScript modules
```

**now.config.json:**
```json
{
  "scope": "x_myapp",
  "scopeId": "<sys_id from instance or generated on first install>"
}
```

**package.json:**
```json
{
  "name": "my-sn-app",
  "version": "1.0.0",
  "scripts": {
    "build": "now-sdk build",
    "deploy": "now-sdk install",
    "explain": "now-sdk explain"
  },
  "devDependencies": {
    "@servicenow/glide": "catalog:",
    "@servicenow/sdk": "catalog:",
    "typescript": "catalog:"
  }
}
```

### Step 4: Write Fluent Definitions

#### Tables

```typescript
// src/fluent/tables.now.ts
import {
  Table, StringColumn, IntegerColumn, BooleanColumn,
  DateColumn, ReferenceColumn
} from '@servicenow/sdk/core'

export const x_myapp_request = Table({
  name: 'x_myapp_request',
  schema: {
    title: StringColumn({ mandatory: true, label: 'Title', maxLength: 200 }),
    priority: IntegerColumn({ mandatory: true, label: 'Priority' }),
    active: BooleanColumn({ mandatory: true, label: 'Active', default: true }),
    due_date: DateColumn({ label: 'Due Date' }),
    assigned_to: ReferenceColumn({
      label: 'Assigned To',
      referenceTable: 'sys_user',
    }),
  },
})
```

#### Business Rules

```typescript
// src/fluent/rules.now.ts
import { BusinessRule } from '@servicenow/sdk/core'

export const validatePriority = BusinessRule({
  $id: Now.ID['validate_priority'],
  name: 'Validate Priority on Create',
  active: true,
  table: 'x_myapp_request',
  when: 'before',
  insert: true,
  script: Now.include('./validate-priority.server.js'),
})
```

```javascript
// src/fluent/validate-priority.server.js
(function executeRule(current, previous) {
  if (!current.priority || current.priority < 1 || current.priority > 5) {
    current.priority = 3; // Default to medium
  }
  if (!current.assigned_to && current.priority == 1) {
    gs.addErrorMessage('Critical requests must have an assignee');
    current.setAbortAction(true);
  }
})(current, previous);
```

#### Flows

```typescript
// src/fluent/flows.now.ts
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const escalationFlow = Flow(
  {
    $id: Now.ID['request_escalation_flow'],
    name: 'Request Escalation Flow',
    description: 'Escalates high-priority requests when unassigned after creation',
  },
  wfa.trigger(
    trigger.record.created,
    { $id: Now.ID['new_request_trigger'] },
    {
      table: 'x_myapp_request',
      condition: 'priority=1^assigned_toISEMPTY',
      run_flow_in: 'background',
      run_on_extended: 'false',
      run_when_setting: 'both',
      run_when_user_setting: 'any',
      run_when_user_list: [],
    }
  ),
  (params) => {
    // Log the escalation
    wfa.action(
      action.core.log,
      { $id: Now.ID['log_escalation'] },
      {
        log_level: 'warn',
        log_message: `Escalating unassigned critical request: ${wfa.dataPill(params.trigger.current.title, 'string')}`,
      }
    )

    // Look up the on-call manager
    const manager = wfa.action(
      action.core.lookUpRecord,
      { $id: Now.ID['lookup_oncall_manager'] },
      {
        table: 'sys_user',
        conditions: 'active=true^roles=manager',
        sort_type: 'sort_asc',
        if_multiple_records_are_found_action: 'use_first_record',
      }
    )

    // Auto-assign to manager
    wfa.action(
      action.core.updateRecord,
      { $id: Now.ID['assign_to_manager'] },
      {
        table_name: 'x_myapp_request',
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        values: TemplateValue({
          assigned_to: wfa.dataPill(manager.Record.sys_id, 'reference'),
        }),
      }
    )

    // Send notification
    wfa.action(
      action.core.sendEmail,
      { $id: Now.ID['notify_manager'] },
      {
        table_name: 'x_myapp_request',
        watermark_email: true,
        ah_subject: `Critical Request Escalation: ${wfa.dataPill(params.trigger.current.title, 'string')}`,
        ah_body: `A critical request has been auto-assigned to you.`,
        record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
        ah_to: wfa.dataPill(manager.Record.email, 'string'),
      }
    )
  }
)
```

#### Catalog Items

```typescript
// src/fluent/catalog.now.ts
import {
  CatalogItem, VariableSet, SingleLineTextVariable,
  MultiLineTextVariable, SelectBoxVariable, ReferenceVariable,
  RequestedForVariable
} from '@servicenow/sdk/core'

const requestInfoVarSet = VariableSet({
  $id: Now.ID['request_info_varset'],
  title: 'Request Details',
  description: 'Core information for the request',
  internalName: 'request_info_varset',
  type: 'singleRow',
  layout: 'normal',
  order: 100,
  displayTitle: true,
  version: 1,
  variables: {
    requestTitle: SingleLineTextVariable({
      question: 'Request Title',
      mandatory: true,
      order: 100,
    }),
    requestDescription: MultiLineTextVariable({
      question: 'Description',
      mandatory: true,
      order: 200,
    }),
    requestPriority: SelectBoxVariable({
      question: 'Priority',
      mandatory: true,
      order: 300,
      choices: {
        critical: { label: '1 - Critical' },
        high: { label: '2 - High' },
        medium: { label: '3 - Medium' },
        low: { label: '4 - Low' },
      },
      defaultValue: 'medium',
    }),
  },
  name: 'Request Details',
})

export const newRequestCatalogItem = CatalogItem({
  $id: Now.ID['new_request_catalog_item'],
  name: 'New Service Request',
  shortDescription: 'Submit a new service request',
  description: 'Use this form to submit a service request. Critical requests trigger automatic escalation.',
  catalogs: ['e0d08b13c3330100c8b837659bba8fb4'], // Service Catalog
  categories: ['d258b953c611227a0146101fb1be7c31'], // Hardware (or your category)
  variableSets: [{ variableSet: requestInfoVarSet, order: 100 }],
  executionPlan: '523da512c611228900811a37c97c2014',
  variables: {
    requestedFor: RequestedForVariable({
      order: 1,
      question: 'Requested For',
    }),
    assignmentGroup: ReferenceVariable({
      order: 2,
      question: 'Assignment Group',
      referenceTable: 'sys_user_group',
    }),
  },
})
```

### Step 5: Build and Install (Tier 1)

```bash
# Build the project (validates TypeScript, generates metadata)
now-sdk build

# Install to instance (creates/updates scoped app and all metadata; async by default)
# `now-sdk deploy` is a hidden alias of `install`
now-sdk install
```

### Step 6: Verify with MCP Tools (Tier 2)

After Fluent deployment, use MCP tools to verify everything landed correctly.

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: application=<app_sys_id>
  fields: sys_id,type,name,sys_created_on
  limit: 50
```

```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: x_myapp_request
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=x_myapp_request^active=true
  fields: name,when,active
```

### Step 7: Handle Fallthrough to Fix Scripts (Tier 3)

For operations that neither Fluent nor REST can handle, generate fix scripts.

**Flow Activation (only if `now-sdk install --skip-flow-activation` was used or activation failed):**
```
Tool: SN-Create-Fix-Script
Parameters:
  script_name: activate_escalation_flow
  description: "Activate the request escalation flow after Fluent install"
  script_content: |
    // Activate the flow in Flow Designer:
    // 1. Open Flow Designer
    // 2. Find "Request Escalation Flow"
    // 3. Click "Activate" to compile and enable
    //
    // Needed only when now-sdk install skipped (--skip-flow-activation)
    // or failed flow activation.
    gs.info('Manual step: Activate flow in Flow Designer UI');
```

**UI Policy Action Linking (if needed):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('sys_ui_policy_action');
    gr.addQuery('ui_policy', '<ui_policy_sys_id>');
    gr.addQuery('catalog_variable', '');
    gr.query();
    while (gr.next()) {
      gr.catalog_variable = 'IO:<variable_sys_id>';
      gr.update();
    }
  description: "Link UI Policy actions to catalog variables"
  record_for_rollback: true
```

**Bulk Data Operations:**
```
Tool: SN-Create-Fix-Script
Parameters:
  script_name: seed_sample_data
  description: "Create initial sample records for testing"
  script_content: |
    var records = [
      { title: 'Test Request 1', priority: 1 },
      { title: 'Test Request 2', priority: 3 },
      { title: 'Test Request 3', priority: 5 }
    ];
    records.forEach(function(data) {
      var gr = new GlideRecord('x_myapp_request');
      gr.initialize();
      gr.title = data.title;
      gr.priority = data.priority;
      gr.active = true;
      gr.insert();
    });
    gs.info('Created ' + records.length + ' sample records');
```

## Hybrid Workflow Example

A complete end-to-end example combining all three tiers:

```
GOAL: Build a scoped app with escalation flow, catalog item, and seed data

TIER 1 (Fluent):
  1. Create now.config.json with scope
  2. Define table schema in tables.now.ts
  3. Define business rules in rules.now.ts
  4. Define escalation flow in flows.now.ts
  5. Define catalog item in catalog.now.ts
  6. now-sdk build && now-sdk install

TIER 2 (MCP REST):
  7. SN-Query-Table → verify all records in update set
  8. SN-Get-Table-Schema → confirm table columns created
  9. SN-Query-Table on sys_script → verify business rules active
  10. SN-Execute-Background-Script → seed sample data

TIER 3 (Fix Script):
  11. SN-Create-Fix-Script → flow activation instructions (only if install did not activate it)
  12. SN-Create-Fix-Script → any UI Policy action linking
  13. Manual (if needed): activate flow in Flow Designer UI
```

## NowSDK Explain Reference

The SDK has built-in documentation accessible via CLI:

```bash
# List all available topics
npx @servicenow/sdk explain --list --format=raw

# Search for a topic
npx @servicenow/sdk explain flow --list --peek --format=raw

# Read full topic (only after previewing)
npx @servicenow/sdk explain flow --format=raw

# Key topics (and tags for --list):
#   quickstart      - Getting-started tag (use with --list)
#   fluent-language-overview - Fluent language conventions
#   keys-file       - keys.ts and record identity
#   Table           - Table definitions
#   Flow            - Flow automation
#   BusinessRule    - Business rule definitions
#   CatalogItem     - Service catalog items
#   Acl             - Access control lists
#   ScriptInclude   - Script includes
#   exec-guide      - Running scripts with now-sdk exec
#   query-guide     - Live instance queries with now-sdk query
#   ci-integration  - CI auth, now-sdk cicd promotion and ATF gates
```

**Important:** Use `--peek` first before reading a full topic to avoid wasting context on irrelevant content (quickstart topics can be read directly).

### Fluent APIs Added in SDK 4.10–4.14

Look each up with `explain` before use:

- `StateModel` — table states, transitions, and gating conditions (4.10)
- `TestSuite`, `GraphQLApi` — ATF suites; scripted GraphQL APIs (4.11)
- `Assessment`, `RiskAssessment` — assessment definitions (4.12)
- `DatabaseView` — `sys_db_view` records (4.13)
- `UiMacro` — `sys_ui_macro` with Jelly via `Now.include()` (4.14)
- Reusable ATF tests — `Test({ isReusable: true, inputs, outputs })`, called with `atf.executeTest`, outputs set with `atf.setReusableTestOutputs` (4.14)

## Fluent API Quick Reference

### Imports by Module

```typescript
// Core metadata
import {
  Table, StringColumn, IntegerColumn, BooleanColumn,
  DateColumn, ReferenceColumn, Record, BusinessRule,
  ScriptInclude, ClientScript, Acl, Role
} from '@servicenow/sdk/core'

// Flow automation
import {
  Flow, Subflow, action, wfa, trigger
} from '@servicenow/sdk/automation'

// Catalog
import {
  CatalogItem, VariableSet, SingleLineTextVariable,
  MultiLineTextVariable, SelectBoxVariable, ReferenceVariable,
  CheckBoxVariable, DateTimeVariable, RequestedForVariable,
  EmailVariable
} from '@servicenow/sdk/core'
```

### Key Helpers

| Helper | Purpose | Example |
|--------|---------|---------|
| `Now.ID['key']` | Reference a record by key name | `$id: Now.ID['my_rule']` |
| `Now.include('./file.js')` | Include external script file | `script: Now.include('./rule.server.js')` |
| `Now.ref(export)` | Cross-reference another Fluent export | `table: Now.ref(myTable)` |
| `Now.attach('./file')` | Attach file to record | `attachment: Now.attach('./logo.png')` |
| `TemplateValue({})` | Set field values in flow actions | `values: TemplateValue({ state: '2' })` |
| `wfa.dataPill(ref, type)` | Reference flow data pills | `wfa.dataPill(params.trigger.current.sys_id, 'reference')` |

### Flow Logic Blocks

```typescript
// Conditional
wfa.flowLogic.if({ $id, condition, annotation }, () => { ... })
wfa.flowLogic.elseIf({ $id, condition, annotation }, () => { ... })
wfa.flowLogic.else({ $id }, () => { ... })

// Loops
wfa.flowLogic.forEach(dataPill, { $id }, () => { ... })

// Subflow outputs
wfa.flowLogic.assignSubflowOutputs({ $id }, params.outputs, { ... })
```

### Flow Actions (action.core.*)

| Action | Purpose |
|--------|---------|
| `action.core.log` | Log message with level |
| `action.core.lookUpRecord` | Query for a single record |
| `action.core.updateRecord` | Update a record |
| `action.core.createRecord` | Create a new record |
| `action.core.sendEmail` | Send email notification |
| `action.core.sendSms` | Send SMS |
| `action.core.sendNotification` | Send notification via template |

### Flow Triggers (trigger.record.*)

| Trigger | Fires When |
|---------|-----------|
| `trigger.record.created` | Record created |
| `trigger.record.updated` | Record updated |
| `trigger.record.createdOrUpdated` | Record created or updated |
| `trigger.record.deleted` | Record deleted |

## Best Practices

- Read the relevant `now-sdk explain` topics before writing Fluent metadata.
- Keep generated metadata in source control and review the resulting platform changes.
- Use the tier decision matrix to avoid mixing deployment models without a clear need.

## Troubleshooting

### NowSDK Not Found
```bash
npm install -g @servicenow/sdk@latest
# Verify: npx @servicenow/sdk --version (must be 4.14.0+)
```

### Auth Failures
```bash
# Re-authenticate
now-sdk auth --add <instance-url> --type basic
# Ensure instance has SDK plugin enabled
# Ensure user has admin or sn_sdk.user role
# "Stored credentials can't be read": keychain locked/cleared, or credentials.enc
# was copied from another machine — re-run now-sdk auth --add on this machine
```

### Build Errors
```bash
# Check explain docs for the specific type
npx @servicenow/sdk explain <TypeName> --format=raw

# Common issues:
# - Missing $id on records → add Now.ID['unique_key']
# - Invalid column types → check Table column type imports
# - Script file not found → verify Now.include() path is relative to .now.ts file
```

### Install Creates Wrong Scope
Verify `now.config.json` has the correct `scope` and `scopeId`. The `scopeId` should match the `sys_id` of the `sys_app` record on your instance.

### Fallthrough: When Fluent Fails
If `now-sdk install` fails for specific record types, fall through:
1. Check if MCP REST can create the record directly (`SN-Create-Record`)
2. If REST also fails, generate a fix script (`SN-Create-Fix-Script`)
3. Document the limitation for future reference
