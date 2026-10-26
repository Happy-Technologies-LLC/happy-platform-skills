---
name: application-scope
version: 1.0.1
description: Manage scoped application development including setting application context and update set alignment
author: Happy Technologies LLC
tags: [admin, scope, application, development, scoped-app]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  mcp: [SN-Set-Current-Application, SN-Set-Update-Set, SN-Get-Current-Update-Set, SN-Query-Table, SN-Create-Record]
  rest: [/api/now/table/sys_app, /api/now/table/sys_update_set]
  native: [Bash, Read]
complexity: intermediate
estimated_time: 10-15 minutes
---

# Application Scope Management

## Overview

Scoped application development in ServiceNow requires careful management of application context and update set alignment. This skill covers setting the current application scope, understanding scoped vs global considerations, and ensuring update sets are properly aligned with application development.

- **What problem does it solve?** Prevents records from being created in wrong application scopes and ensures proper update set capture for scoped applications
- **Who should use this skill?** ServiceNow developers building custom scoped applications
- **What are the expected outcomes?** Properly scoped application artifacts with correct update set capture and namespace isolation

## Prerequisites

- Required ServiceNow roles: `admin` or `application_creator`
- An existing scoped application or permission to create one
- Understanding of ServiceNow application scopes and namespaces
- Related skills: `admin/update-set-management` (must understand update sets first)

## Procedure

### Step 1: Identify Target Application

First, find the application you want to work in.

**Using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_app
  query: scope!=global^active=true
  fields: sys_id,name,scope,version,vendor
  limit: 50
```

**Expected Response:**
```json
{
  "result": [
    {
      "sys_id": "abc123def456...",
      "name": "My Custom Application",
      "scope": "x_myco_custom_app",
      "version": "1.0.0",
      "vendor": "My Company"
    }
  ]
}
```

**Decision Points:**
- If application exists → Proceed to Step 2
- If application not found → Create new application (see Example 3)
- If choosing between multiple apps → Verify scope prefix matches intended namespace

### Step 2: Set Current Application Scope

Set the application context for all subsequent operations.

**Using MCP tools:**
```
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: abc123def456...
```

**Important:** The tool switches scope through the UI application picker and reads the picker back in the same session.
It reports success, with the previous scope, only when the change took effect; otherwise it returns an error. Pass
`global` as `app_sys_id` to return to the Global scope.

**Verification:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_preference
  query: user=javascript:gs.getUserID()^name=apps.current_app
  fields: value
```

### Step 3: Verify or Create Application Update Set

Scoped applications should have their own update sets to maintain clean separation.

**Query existing update sets for the application:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_set
  query: application=abc123def456...^state=in progress
  fields: sys_id,name,state,application
  limit: 10
```

**Decision Points:**
- If suitable update set exists → Use existing (Step 4)
- If no update set or all completed → Create new update set

**Create application-specific update set:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_update_set
  data:
    name: "My Custom App - Feature Development v1.1"
    application: abc123def456...
    state: in progress
    description: "Development update set for new features"
```

### Step 4: Set Current Update Set

Align the update set with the application scope.

**Using MCP tools:**
```
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: xyz789ghi012...
```

The tool also uses the UI picker and verifies the change in the same session; the response names the previous update
set. If the change cannot be verified, no success is reported and the tool writes a fix script to `./scripts` for manual
execution in Scripts - Background. It has no scheduled-job fallback.

**Verification:**
```
Tool: SN-Get-Current-Update-Set
Parameters: (none required)
```

**Expected Response:**
```json
{
  "name": "My Custom App - Feature Development v1.1",
  "sys_id": "xyz789ghi012...",
  "state": "in progress",
  "application": "abc123def456..."
}
```

### Step 5: Verify Scope and Update Set Alignment

Confirm both scope and update set are properly set before development.

**Full verification query:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_set
  query: sys_id=xyz789ghi012...
  fields: sys_id,name,application.name,application.scope
```

**Alignment Checklist:**
- [ ] Application scope matches intended app
- [ ] Update set application field references correct app
- [ ] Update set state is "in progress"
- [ ] User has write access to the scope

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose |
|------|---------|
| `SN-Set-Current-Application` | Set active application scope |
| `SN-Set-Update-Set` | Set active update set |
| `SN-Get-Current-Update-Set` | Verify current update set |
| `SN-Query-Table` | Query applications and update sets |
| `SN-Create-Record` | Create new update sets |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sys_app` | GET | List applications |
| `/api/now/table/sys_update_set` | GET | List update sets |
| `/api/now/table/sys_update_set` | POST | Create update set |

**Note:** Setting current application via REST API requires background script execution or session manipulation, which is complex. MCP tools handle this automatically.

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute curl commands for REST operations |
| `Read` | Read application configuration files |

## Scoped vs Global Considerations

### When to Use Scoped Applications

**Use Scoped Applications When:**
- Building reusable, distributable applications
- Developing features that need namespace isolation
- Creating applications for the ServiceNow Store
- Building tenant-specific customizations in multi-tenant scenarios
- Implementing features that should survive upgrades cleanly

**Use Global Scope When:**
- Making small, one-off customizations
- Modifying out-of-box ServiceNow features
- Creating integrations that need broad table access
- Prototyping before committing to scoped architecture

### Scoped Application Benefits

| Benefit | Description |
|---------|-------------|
| **Namespace Isolation** | Tables, scripts, and UI elements prefixed with scope (e.g., `x_myco_app_*`) |
| **Upgrade Protection** | Scoped artifacts are isolated from platform upgrades |
| **Dependency Management** | Clear dependencies between applications |
| **Access Control** | Application-level access restrictions |
| **Portability** | Easy export/import via update sets or store |

### Scoped Application Restrictions

| Restriction | Impact | Workaround |
|-------------|--------|------------|
| **Limited GlideRecord access** | Cannot query all global tables by default | Request cross-scope access via Application Properties |
| **Restricted APIs** | Some GlideSystem APIs unavailable | Use allowed APIs or request elevation |
| **UI limitations** | Cannot modify global UI elements | Create scoped UI components |
| **Script Include visibility** | Must explicitly expose for cross-scope | Set `accessible_from: all_application_scopes` |

### Cross-Scope Access

To allow a scoped application to access global or other scoped tables:

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_scope_privilege
  data:
    application: abc123def456...
    table: incident
    operation: read_write
    status: allowed
```

## Best Practices

- **Set Scope BEFORE Update Set:** Always set application scope first, then set the update set. This ensures the update set is associated with the correct application.
- **One Update Set Per Feature:** Create separate update sets for distinct features or sprints to enable granular deployments
- **Naming Convention:** Use consistent naming: `{App Name} - {Feature/Sprint} - {Version}` (e.g., "My App - User Portal v1.2")
- **Verify Before Development:** Run the full verification procedure (Steps 1-5) at the start of each development session
- **Application-Aligned Update Sets:** Always create update sets with the `application` field set to your scoped app's sys_id
- **Scope Prefix Consistency:** Maintain consistent scope prefixes across related applications (e.g., `x_myco_*`)

## Troubleshooting

### Common Issue 1: Records Created in Wrong Scope

**Symptom:** New records appear in Global scope instead of intended application
**Cause:** Application scope not set before record creation
**Solution:**
1. Set application scope using `SN-Set-Current-Application`
2. Verify scope is active by querying sys_user_preference
3. Delete incorrectly scoped records and recreate

### Common Issue 2: Update Set Not Capturing Records

**Symptom:** Changes not appearing in update set
**Cause:** Update set not aligned with application scope or update set not active
**Solution:**
1. Verify update set `application` field matches current scope
2. Confirm update set state is "in progress"
3. Check that the table being modified is captured in update sets (some tables excluded)

### Common Issue 3: Cannot Set Application Scope

**Symptom:** `SN-Set-Current-Application` fails or has no effect
**Cause:** Insufficient permissions or application not found
**Solution:**
1. Verify user has `admin` or `application_creator` role
2. Confirm app_sys_id is correct and application exists
3. Check application is active (not retired)

### Common Issue 4: Cross-Scope Access Denied

**Symptom:** GlideRecord queries return no results or throw errors
**Cause:** Scoped application lacks permission to access target table
**Solution:**
1. Create sys_scope_privilege record granting access
2. Or modify script include to use `GlideRecordSecure` with elevated privileges
3. Request cross-scope access in Application Properties

### Common Issue 5: Update Set Associated with Wrong Application

**Symptom:** Update set exists but linked to Global or different app
**Cause:** Update set created before setting application scope
**Solution:**
1. Update the update set's `application` field:
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_set
  sys_id: xyz789ghi012...
  data:
    application: abc123def456...
```
2. Move existing records to new application-aligned update set if needed

## Examples

### Example 1: Standard Development Session Setup

Complete setup for starting a scoped development session:

```
# Step 1: Find application
Tool: SN-Query-Table
Parameters:
  table_name: sys_app
  query: scope=x_myco_custom_app
  fields: sys_id,name,scope

# Step 2: Set application scope
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: abc123def456...

# Step 3: Find or create update set
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_set
  query: application=abc123def456...^state=in progress
  fields: sys_id,name

# Step 4: Set update set
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: xyz789ghi012...

# Step 5: Verify setup
Tool: SN-Get-Current-Update-Set
Parameters: (none)
```

### Example 2: Create New Update Set for Application

Create a properly aligned update set:

```
# Create update set linked to application
Tool: SN-Create-Record
Parameters:
  table_name: sys_update_set
  data:
    name: "Customer Portal - Sprint 14"
    application: abc123def456...
    state: in progress
    description: "Sprint 14 features: ticket submission, knowledge base search"

# Set as current
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: [sys_id from above]
```

### Example 3: Create New Scoped Application

Create a new scoped application from scratch:

```
# Step 1: Create the application
Tool: SN-Create-Record
Parameters:
  table_name: sys_app
  data:
    name: "My New Application"
    scope: "x_myco_newapp"
    version: "1.0.0"
    vendor: "My Company"
    short_description: "Application for managing custom workflows"

# Step 2: Set as current application
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: [sys_id from above]

# Step 3: Create initial update set
Tool: SN-Create-Record
Parameters:
  table_name: sys_update_set
  data:
    name: "My New Application - Initial Development"
    application: [sys_id from step 1]
    state: in progress

# Step 4: Set update set
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: [sys_id from step 3]
```

### Example 4: Multi-Instance Scoped Development

Set scope on specific instance:

```
# Set application on dev instance
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: abc123def456...
  instance: dev

# Set update set on dev instance
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: xyz789ghi012...
  instance: dev

# Verify on dev instance
Tool: SN-Get-Current-Update-Set
Parameters:
  instance: dev
```

### Example 5: Verify Update Set Record Capture

Confirm records are being captured correctly:

```
# Create a test record
Tool: SN-Create-Record
Parameters:
  table_name: sys_properties
  data:
    name: x_myco_app.test_property
    value: test_value
    type: string

# Verify capture in update set
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=xyz789ghi012...^nameSTARTSWITHsys_properties
  fields: sys_id,name,type,action
  limit: 10
```

## Complete Automated Workflow

Full automation example combining scope and update set management:

```
# FULLY AUTOMATED SCOPED APP DEVELOPMENT (Zero Manual Steps!)

# 1. Query for existing application
Tool: SN-Query-Table
Parameters:
  table_name: sys_app
  query: scope=x_myco_custom_app
  fields: sys_id,name,scope,version

# 2. Set as current application (UI picker, verified in the same session)
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: abc123def456...

# 3. Find or create update set
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_set
  query: application=abc123def456...^state=in progress
  fields: sys_id,name

# 4. Set update set (UI picker, verified in the same session)
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: xyz789ghi012...

# 5. Verify both are active
Tool: SN-Get-Current-Update-Set
Parameters: (none)

# 6. Begin development - create business rule
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Validate Custom Record
    table: x_myco_custom_app_records
    when: before
    active: true
    script: |
      (function executeRule(current, previous) {
        if (!current.name) {
          gs.addErrorMessage('Name is required');
          current.setAbortAction(true);
        }
      })(current, previous);

# 7. Verify capture
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=xyz789ghi012...
  fields: sys_id,type,name,action
```

## Related Skills

- `admin/update-set-management` - Managing update sets in detail
- `admin/instance-management` - Switching instances for scoped development
- `admin/deployment-workflow` - Deploying scoped applications across instances
- `admin/batch-operations` - Bulk operations within a scope

## References

- [ServiceNow Scoped Application Development](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/concept/c_ApplicationDevelopment.html)
- [Application Scope](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/concept/c_ApplicationScope.html)
- [Cross-Scope Access](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/concept/c_CrossScopeAccess.html)
- [Update Sets and Scoped Applications](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/concept/c_UpdateSetsAndScopedApps.html)
- [ServiceNow Store Publishing](https://docs.servicenow.com/bundle/utah-application-development/page/build/applications/task/t_PublishAppToStore.html)
