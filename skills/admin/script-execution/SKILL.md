---
name: script-execution
version: 1.1.0
description: Run background scripts through the Scripts - Background processor with parsed output, scope selection, and record rollback, plus the sys_trigger fallback, fix scripts, and logging
author: Happy Technologies LLC
tags: [admin, scripts, automation, rollback, fix-scripts, debugging, development]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Execute-Background-Script
    - SN-Create-Fix-Script
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Move-Records-To-Update-Set
  rest:
    - /sys.scripts.do
    - /api/now/table/sys_script_execution_history
    - /api/now/table/sys_rollback_context
    - /api/now/table/sys_trigger
    - /api/now/table/syslog
    - /api/now/table/sys_script_fix
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 10-30 minutes
---

# Script Execution

## Overview

This skill covers safe and effective execution of background scripts in ServiceNow®:

- Script execution through the Scripts - Background processor (`/sys.scripts.do`)
- Record rollback, scope selection, and handling of unknown outcomes
- Safe script patterns and templates
- Fix script generation for manual execution
- Error handling and logging best practices
- Debugging and troubleshooting techniques

**When to use:** When MCP tools don't support the required operation, or when complex data manipulation is needed.

**Who should use this:** Administrators and developers who need to execute server-side JavaScript in ServiceNow.

## Prerequisites

- **Roles:** `admin` (background script execution requires full admin)
- **Access:** sys_script_execution_history, sys_rollback_context, syslog, sys_script_fix tables
- **Knowledge:** GlideRecord API, ServiceNow server-side JavaScript
- **Caution:** Background scripts run with elevated privileges - test carefully

## Execution Methods

### Method Comparison

| Method | Automation | Rollback | Use Case |
|--------|------------|----------|----------|
| `/sys.scripts.do` processor (default) | Full | Yes, when records change | All automated script runs |
| sys_trigger job (automatic fallback or `wait: false`) | Full | No | Processor unavailable; fire-and-forget |
| Fix Script | Manual | No | Audit trail, reviewed or repeatable runs |
| Scripts - Background page | Manual | Yes | One-time interactive testing |

`now-sdk exec` (ServiceNow SDK 4.14.0) uses the same processor and records rollback by default; its `--scope` and
`--reason` options match `scope` and `description` below.

## Procedure

### Phase 1: Automated Execution (Recommended)

#### Step 1.1: Run a Script

`SN-Execute-Background-Script` posts the script once to `/sys.scripts.do`, the processor behind
**System Definition > Scripts - Background**, as the authenticated user in that user's own session.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var count = 0;
    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.addQuery('priority', 1);
    gr.setLimit(10);
    gr.query();

    while (gr.next()) {
      count++;
      gs.info('Found P1 incident: ' + gr.number);
    }

    gs.info('Total P1 incidents found: ' + count);
  description: Count active P1 incidents
```

**Parameters:**

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `script` | (required) | Server-side JavaScript to run |
| `description` | none | Reason, appended to the script as a one-line comment and kept in Script Execution History |
| `scope` | caller's current scope | `global`, an application scope name (e.g. `x_acme_app`), or a `sys_scope` sys_id; an unknown scope is rejected before anything runs |
| `record_for_rollback` | `true` | Record the run's record changes in a rollback context |
| `wait` | `true` | `false` skips the processor and schedules a fire-and-forget sys_trigger job |

**The result contains:**
- Success or failure, and which method ran (processor, or the sys_trigger fallback and why)
- Output lines from `gs.info()` (and `gs.print()` in global), and script or compilation errors
- The scope the script ran in
- A link to the run's `sys_script_execution_history` record
- A link to its `sys_rollback_context` record, only when the script changed records and rollback was recorded

Script errors are returned as tool errors; a failed run is never reported as success.

Because the script runs in the caller's session, the caller's current update set is expected to capture tracked
configuration writes (not verified). Set it first with `SN-Set-Update-Set` and confirm with `sys_update_xml` afterwards.

#### Step 1.2: Choose a Scope

| Target | Behavior |
|--------|----------|
| `global` | Runs; `gs.print()` and `gs.info()` both return output |
| Custom application scope (`x_...`) | Runs in that scope; `gs.print()` is blocked in scoped scripts, so use `gs.info()` |
| Store application scope owned by ServiceNow (e.g. `sn_cmdb_int_util`) | Refused with "not authorized"; the script does not run |

A non-global `scope` is never handed to the sys_trigger fallback, because that path cannot honor it. When the processor
refuses, the tool reports the script as not run.

#### Step 1.3: Roll Back a Run

With `record_for_rollback` left at `true`, a run that changes records returns a `sys_rollback_context` link. A run that
changes nothing records no context. To undo the run's record changes, either open the rollback context record and use
its **Rollback** button, or run the rollback server-side with rollback recording turned off:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var worker = new GlideRollbackWorker();
    worker.setRollbackContextID('<rollback_context_sys_id>');
    worker.setBackground(false);
    worker.start();
  description: Roll back run <rollback_context_sys_id>
  record_for_rollback: false
```

**Verify the rollback:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_rollback_context
  sys_id: <rollback_context_sys_id>
  fields: state
```

The `state` becomes `rolled_back`. Runs on the sys_trigger path record no rollback context, so plan an explicit undo
script before using `wait: false`.

#### Step 1.4: Handle an Unknown Outcome

A timeout, HTTP 5xx, dropped connection, or unrecognized response returns **"Unknown outcome"**: the script may or may
not have run, and the tool does not fall back.

**Never re-run the script after an unknown outcome.** Check Script Execution History first:

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_execution_history
  query: ORDERBYDESCsys_created_on
  limit: 5
```

Find the run by its `description` comment. If it ran, inspect its result and any rollback context. Re-run only after
confirming it did not run. The instance cancels a processor run still going after four hours.

#### Step 1.5: Understand the sys_trigger Fallback

The tool hands the script to a sys_trigger job only when the processor provably did not run it: HTTP 401/403/404, a
login page, a "not authorized" refusal for a global run, or a connection refused before sending. `wait: false` uses
the same path on purpose. That job:

- Runs in the scheduler's session, not the caller's, so tracked configuration writes may land in the **Default**
  update set. Check `sys_update_xml` and move rows with `SN-Move-Records-To-Update-Set`.
- Records no rollback context.
- Reports through `syslog`: with `wait: true` the tool polls `syslog` for a completion marker and returns
  `completed`, `failed`, or `timeout` plus captured logs; with `wait: false` it returns only the trigger details.

**Check fallback output in System Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKEP1 incident^sys_created_on>javascript:gs.minutesAgo(5)
  fields: message,level,sys_created_on,source
  limit: 20
```

**Log Levels:**
| Level | Method | Purpose |
|-------|--------|---------|
| 0 | gs.info() | Informational messages |
| 1 | gs.warn() | Warning messages |
| 2 | gs.error() | Error messages |
| 3 | gs.debug() | Debug messages (if enabled) |

### Phase 2: Safe Script Patterns

#### Step 2.1: Query Pattern (Read-Only)

Safe pattern for reading data:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe read-only pattern
    var results = [];

    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.addQuery('priority', 1);
    gr.setLimit(100);  // Always set a limit
    gr.query();

    while (gr.next()) {
      results.push({
        number: gr.number.toString(),
        short_description: gr.short_description.toString(),
        assigned_to: gr.assigned_to.getDisplayValue(),
        created: gr.sys_created_on.toString()
      });
    }

    gs.info('Query Results: ' + JSON.stringify(results, null, 2));
  description: Query active P1 incidents (read-only)
```

#### Step 2.2: Update Pattern (With Safety Checks)

Pattern for updating records with safety measures:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe update pattern with validation
    var TABLE = 'incident';
    var QUERY = 'active=true^priority=1^assigned_toISEMPTY';
    var MAX_UPDATES = 10;  // Limit updates per execution

    // DRY RUN flag - set to false to actually update
    var DRY_RUN = true;

    var updated = 0;
    var skipped = 0;

    var gr = new GlideRecord(TABLE);
    gr.addEncodedQuery(QUERY);
    gr.setLimit(MAX_UPDATES);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' records to process');

    while (gr.next()) {
      // Validate before update
      if (!gr.canWrite()) {
        gs.warn('Cannot write to: ' + gr.number);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        gs.info('[DRY RUN] Would update: ' + gr.number);
      } else {
        gr.work_notes = 'Automated: Escalating unassigned P1';
        gr.assignment_group = 'Critical Incidents Team';
        gr.update();
        gs.info('Updated: ' + gr.number);
        updated++;
      }
    }

    gs.info('Summary: Updated=' + updated + ', Skipped=' + skipped + ', DryRun=' + DRY_RUN);
  description: Escalate unassigned P1 incidents (with dry run)
```

#### Step 2.3: Insert Pattern (With Duplicate Check)

Pattern for creating records safely:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe insert pattern with duplicate check
    var TABLE = 'sys_properties';
    var PROPERTY_NAME = 'custom.automation.enabled';
    var PROPERTY_VALUE = 'true';

    // Check for existing
    var existing = new GlideRecord(TABLE);
    existing.addQuery('name', PROPERTY_NAME);
    existing.query();

    if (existing.next()) {
      gs.warn('Property already exists: ' + PROPERTY_NAME + ' = ' + existing.value);

      // Update if different
      if (existing.value != PROPERTY_VALUE) {
        existing.value = PROPERTY_VALUE;
        existing.update();
        gs.info('Updated property value to: ' + PROPERTY_VALUE);
      }
    } else {
      // Create new
      var gr = new GlideRecord(TABLE);
      gr.initialize();
      gr.name = PROPERTY_NAME;
      gr.value = PROPERTY_VALUE;
      gr.description = 'Created by automated script';
      var sysId = gr.insert();
      gs.info('Created property: ' + PROPERTY_NAME + ' (sys_id: ' + sysId + ')');
    }
  description: Create or update system property
```

#### Step 2.4: Delete Pattern (With Confirmation)

Pattern for deleting records with extreme caution:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // DANGEROUS: Delete pattern - use with extreme caution
    var TABLE = 'sys_user_preference';
    var QUERY = 'user.active=false^sys_created_on<javascript:gs.daysAgo(365)';
    var MAX_DELETES = 10;

    // SAFETY: Always start with dry run
    var DRY_RUN = true;
    var CONFIRMATION_CODE = 'DELETE_CONFIRMED_2026';
    var PROVIDED_CODE = 'INTENTIONALLY_WRONG';  // Must match to delete

    if (!DRY_RUN && PROVIDED_CODE !== CONFIRMATION_CODE) {
      throw new Error('SAFETY: Confirmation code mismatch. Aborting delete.');
    }

    var gr = new GlideRecord(TABLE);
    gr.addEncodedQuery(QUERY);
    gr.setLimit(MAX_DELETES);
    gr.query();

    var count = 0;
    var deleted = [];

    while (gr.next()) {
      count++;
      if (DRY_RUN) {
        gs.info('[DRY RUN] Would delete: ' + gr.sys_id + ' - ' + gr.name);
      } else {
        deleted.push(gr.sys_id.toString());
        gr.deleteRecord();
      }
    }

    if (DRY_RUN) {
      gs.info('[DRY RUN] Would delete ' + count + ' records');
    } else {
      gs.info('Deleted ' + deleted.length + ' records: ' + JSON.stringify(deleted));
    }
  description: Delete old user preferences (dry run mode)
```

### Phase 3: Fix Script Generation

#### Step 3.1: Generate a Fix Script for Manual Execution

When automated execution is unavailable or a person must review and run the script, `SN-Create-Fix-Script` writes it
to a new file in the MCP server's `./scripts` directory. Paste it into **Scripts - Background** to run it.

**Using MCP:**
```
Tool: SN-Create-Fix-Script
Parameters:
  script_name: FIX_IncidentDataCleanup_20260206
  script_content: |
    // Fix Script: Clean up old resolved incidents
    // Author: Admin
    // Date: 2026-02-06
    // JIRA: PROJ-123

    var cutoffDays = 90;
    var cutoffDate = gs.daysAgo(cutoffDays);

    gs.info('=== Starting Incident Cleanup ===');
    gs.info('Cutoff date: ' + cutoffDate);

    var gr = new GlideRecord('incident');
    gr.addQuery('state', 'IN', '6,7,8');  // Resolved, Closed, Cancelled
    gr.addQuery('sys_updated_on', '<', cutoffDate);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' incidents to archive');

    // Archive logic here

    gs.info('=== Cleanup Complete ===');
  description: Clean up old resolved incidents for data hygiene
```

**Fix Script Record (audit trail, repeatable runs):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_fix
  data:
    name: FIX_IncidentDataCleanup_20260206
    script: |
      // Script content here
    description: Clean up old resolved incidents
    active: true
```

#### Step 3.2: Query Fix Scripts

**Find Existing Fix Scripts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_fix
  query: active=true
  fields: name,description,sys_created_on,run_count
  limit: 50
```

### Phase 4: Error Handling

#### Step 4.1: Try-Catch Pattern

Always wrap scripts in try-catch for error handling:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Comprehensive error handling pattern
    var scriptName = 'UpdateIncidentPriorities';
    var startTime = new GlideDateTime();

    try {
      gs.info('[' + scriptName + '] Starting execution');

      // Main logic
      var gr = new GlideRecord('incident');
      gr.addQuery('active', true);
      gr.setLimit(100);
      gr.query();

      var processed = 0;
      var errors = 0;

      while (gr.next()) {
        try {
          // Process each record
          processed++;
          // ... logic here
        } catch (recordError) {
          errors++;
          gs.error('[' + scriptName + '] Error processing ' + gr.number + ': ' + recordError.message);
        }
      }

      gs.info('[' + scriptName + '] Completed. Processed=' + processed + ', Errors=' + errors);

    } catch (e) {
      gs.error('[' + scriptName + '] Fatal error: ' + e.message);
      gs.error('[' + scriptName + '] Stack: ' + e.stack);
    } finally {
      var endTime = new GlideDateTime();
      var duration = GlideDateTime.subtract(startTime, endTime).getNumericValue() / 1000;
      gs.info('[' + scriptName + '] Duration: ' + duration + ' seconds');
    }
  description: Update incident priorities with full error handling
```

#### Step 4.2: Multi-Step Update with Manual Undo

For a processor run, `record_for_rollback` (Step 1.3) already lets you roll back every record change the run made.
Use an in-script undo only when later steps must reverse earlier ones within the same run, or on the sys_trigger path,
which records no rollback context:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Transaction-like pattern with rollback capability
    var changes = [];
    var success = true;

    try {
      // Step 1: Update incident
      var incident = new GlideRecord('incident');
      incident.get('[incident_sys_id]');
      var oldState = incident.state.toString();
      incident.state = 6;  // Resolved
      incident.update();
      changes.push({ table: 'incident', sys_id: incident.sys_id.toString(), field: 'state', old: oldState, new: '6' });
      gs.info('Step 1 complete: Incident updated');

      // Step 2: Update related task
      var task = new GlideRecord('sc_task');
      task.get('[task_sys_id]');
      var oldTaskState = task.state.toString();
      task.state = 3;  // Closed Complete
      task.update();
      changes.push({ table: 'sc_task', sys_id: task.sys_id.toString(), field: 'state', old: oldTaskState, new: '3' });
      gs.info('Step 2 complete: Task updated');

      // Step 3: Something that might fail
      // Simulating failure for demo
      // throw new Error('Simulated failure');

      gs.info('All steps completed successfully');

    } catch (e) {
      gs.error('Error occurred: ' + e.message);
      gs.info('Rolling back ' + changes.length + ' changes...');

      // Rollback in reverse order
      for (var i = changes.length - 1; i >= 0; i--) {
        var change = changes[i];
        var rollback = new GlideRecord(change.table);
        rollback.get(change.sys_id);
        rollback[change.field] = change.old;
        rollback.update();
        gs.info('Rolled back: ' + change.table + '.' + change.sys_id);
      }

      gs.info('Rollback complete');
    }
  description: Multi-step update with rollback capability
```

### Phase 5: Logging Best Practices

#### Step 5.1: Structured Logging

Use consistent log formatting:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Structured logging pattern
    var Logger = {
      scriptName: 'DataMigration',

      info: function(message, data) {
        var logMessage = '[' + this.scriptName + '] [INFO] ' + message;
        if (data) logMessage += ' | Data: ' + JSON.stringify(data);
        gs.info(logMessage);
      },

      warn: function(message, data) {
        var logMessage = '[' + this.scriptName + '] [WARN] ' + message;
        if (data) logMessage += ' | Data: ' + JSON.stringify(data);
        gs.warn(logMessage);
      },

      error: function(message, error) {
        var logMessage = '[' + this.scriptName + '] [ERROR] ' + message;
        if (error) logMessage += ' | Error: ' + error.message;
        gs.error(logMessage);
      },

      metric: function(name, value) {
        gs.info('[' + this.scriptName + '] [METRIC] ' + name + '=' + value);
      }
    };

    // Usage
    Logger.info('Starting migration', { source: 'incident', target: 'x_custom_incident' });
    Logger.metric('records_processed', 150);
    Logger.warn('Skipped record due to missing field', { number: 'INC0012345' });
    Logger.error('Failed to process record', new Error('Invalid reference'));
  description: Demonstrate structured logging pattern
```

#### Step 5.2: Query Script Logs

Processor runs return `gs.info()` output directly in the tool result. Query `syslog` for sys_trigger runs, for
messages logged by code the script calls, or to search past runs.

**Find Script Execution Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: source=Script execution^sys_created_on>javascript:gs.hoursAgo(1)
  fields: message,level,sys_created_on
  limit: 100
```

**Filter by Script Name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKE[DataMigration]^sys_created_on>javascript:gs.hoursAgo(1)
  fields: message,level,sys_created_on
  limit: 100
```

### Phase 6: Advanced Patterns

#### Step 6.1: Batch Processing with Progress

For long-running operations:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Batch processing with progress tracking
    var BATCH_SIZE = 100;
    var MAX_BATCHES = 10;
    var TABLE = 'incident';
    var QUERY = 'active=true';

    var totalProcessed = 0;
    var totalRecords = 0;
    var batchNum = 0;

    // Get total count
    var countGR = new GlideAggregate(TABLE);
    countGR.addEncodedQuery(QUERY);
    countGR.addAggregate('COUNT');
    countGR.query();
    if (countGR.next()) {
      totalRecords = parseInt(countGR.getAggregate('COUNT'));
    }
    gs.info('Total records to process: ' + totalRecords);

    // Process in batches
    while (batchNum < MAX_BATCHES) {
      var gr = new GlideRecord(TABLE);
      gr.addEncodedQuery(QUERY);
      gr.orderBy('sys_created_on');
      gr.chooseWindow(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE);
      gr.query();

      if (!gr.hasNext()) {
        gs.info('No more records to process');
        break;
      }

      var batchProcessed = 0;
      while (gr.next()) {
        // Process record
        batchProcessed++;
        totalProcessed++;
      }

      var progress = Math.round((totalProcessed / totalRecords) * 100);
      gs.info('Batch ' + (batchNum + 1) + ' complete: ' + batchProcessed + ' records | Progress: ' + progress + '%');

      batchNum++;
    }

    gs.info('Processing complete. Total processed: ' + totalProcessed + '/' + totalRecords);
  description: Batch processing with progress tracking
```

#### Step 6.2: Long-Running Work in Resumable Chunks

Keep each run short. Store progress, process one chunk per run, and run the same script again after checking the
previous result. A processor run still going after four hours is cancelled by the instance.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Resumable chunk: safe to run repeatedly until it reports completion
    var RECORDS_PER_EXECUTION = 1000;
    var TRACKER = 'x_custom.migration.last_processed';

    var tracker = gs.getProperty(TRACKER, '');

    var gr = new GlideRecord('incident');
    if (tracker) {
      gr.addQuery('sys_created_on', '>', tracker);
    }
    gr.orderBy('sys_created_on');
    gr.setLimit(RECORDS_PER_EXECUTION);
    gr.query();

    var lastProcessed = '';
    var count = 0;

    while (gr.next()) {
      // Process record
      count++;
      lastProcessed = gr.sys_created_on.toString();
    }

    if (count == RECORDS_PER_EXECUTION) {
      gs.setProperty(TRACKER, lastProcessed);
      gs.info('Processed ' + count + ' records. Last: ' + lastProcessed + '. Run again to continue.');
    } else {
      gs.setProperty(TRACKER, '');
      gs.info('Migration complete. Final chunk: ' + count + ' records.');
    }
  description: Resumable incident migration chunk
```

Run the next chunk only after the previous run returned a result. If a run returns an unknown outcome, check Script
Execution History before continuing (Step 1.4). For unattended recurring or self-continuing work, use a scheduled job
instead (`development/scheduled-jobs`).

## Script Templates

### Template 1: Data Audit

```javascript
// Data Audit Template
var TABLE = 'incident';
var AUDIT_FIELDS = ['state', 'priority', 'assigned_to'];

var audit = {};
AUDIT_FIELDS.forEach(function(field) {
  audit[field] = {};
});

var gr = new GlideRecord(TABLE);
gr.addQuery('active', true);
gr.query();

while (gr.next()) {
  AUDIT_FIELDS.forEach(function(field) {
    var value = gr.getDisplayValue(field) || '(empty)';
    audit[field][value] = (audit[field][value] || 0) + 1;
  });
}

gs.info('Audit Results:\n' + JSON.stringify(audit, null, 2));
```

### Template 2: Reference Data Validation

```javascript
// Reference Validation Template
var TABLE = 'incident';
var REF_FIELD = 'assigned_to';
var REF_TABLE = 'sys_user';

var invalid = [];
var gr = new GlideRecord(TABLE);
gr.addQuery('active', true);
gr.addQuery(REF_FIELD + '.active', false);  // Reference to inactive record
gr.query();

while (gr.next()) {
  invalid.push({
    number: gr.number.toString(),
    invalid_ref: gr.getDisplayValue(REF_FIELD)
  });
}

gs.info('Found ' + invalid.length + ' records with invalid references');
gs.info(JSON.stringify(invalid, null, 2));
```

### Template 3: Bulk Field Update

```javascript
// Bulk Field Update Template
var TABLE = 'incident';
var QUERY = 'active=true^category=inquiry';
var UPDATES = {
  subcategory: 'general',
  contact_type: 'email'
};
var DRY_RUN = true;

var gr = new GlideRecord(TABLE);
gr.addEncodedQuery(QUERY);
gr.query();

var updated = 0;
while (gr.next()) {
  if (DRY_RUN) {
    gs.info('[DRY RUN] Would update ' + gr.number);
  } else {
    for (var field in UPDATES) {
      gr[field] = UPDATES[field];
    }
    gr.update();
    updated++;
  }
}

gs.info((DRY_RUN ? '[DRY RUN] ' : '') + 'Updated ' + updated + ' records');
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Execute | SN-Execute-Background-Script | Run server-side JavaScript through `/sys.scripts.do` |
| Roll Back | SN-Execute-Background-Script | Run `GlideRollbackWorker` with `record_for_rollback: false` |
| Check Rollback | SN-Get-Record | Read `sys_rollback_context` state |
| Check History | SN-Query-Table | Read `sys_script_execution_history` after an unknown outcome |
| Query Logs | SN-Query-Table | Read `syslog` for sys_trigger runs |
| Move Captured Rows | SN-Move-Records-To-Update-Set | Move sys_trigger captures out of the Default update set |
| Fix Script | SN-Create-Fix-Script | Write a script file for manual execution |
| Create Record | SN-Create-Record | Create a `sys_script_fix` record |

## Best Practices

- **Always Use Dry Run First:** Test with DRY_RUN = true before real execution
- **Set Limits:** Always use setLimit() to prevent runaway scripts
- **Log Extensively:** Use structured logging for debugging
- **Handle Errors:** Wrap all scripts in try-catch
- **Document Scripts:** Include author, date, ticket reference in comments
- **Avoid Hardcoding:** Use variables for sys_ids and queries
- **Test in Sub-Production:** Never run untested scripts in production
- **Keep Rollback On:** Leave `record_for_rollback` at `true` for any run that changes data
- **Never Re-Run Blindly:** After an unknown outcome, check Script Execution History before running again

## Troubleshooting

### Script Doesn't Execute

**Symptom:** The tool reports the script was NOT run
**Causes:**
- The processor answered 401/403/404, a login page, or "not authorized"; for a global run the tool falls back to
  sys_trigger and says so in the result
- A non-global `scope` was refused (store application scopes owned by ServiceNow answer "not authorized"); no
  fallback is used
- `scope` names no `sys_scope` record and was rejected before sending
- The user lacks the `admin` role
**Solution:** Use a custom application scope or `global`, confirm the user has `admin`, and read the reason in the
result before retrying.

### Unknown Outcome

**Symptom:** "Unknown outcome" after a timeout, HTTP 5xx, or unrecognized response
**Solution:** Do not re-run. Check `sys_script_execution_history` (Step 1.4) and re-run only if the script did not run.

### Scoped Script Shows No Output

**Symptom:** A script in an `x_` scope runs but returns no output
**Cause:** `gs.print()` is blocked in scoped scripts
**Solution:** Use `gs.info()`.

### Configuration Changes Captured in the Default Update Set

**Symptom:** Changes made by a sys_trigger run appear in the Default update set
**Cause:** The sys_trigger job runs in the scheduler's session
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set.name=Default^sys_created_on>javascript:gs.minutesAgo(15)
  fields: sys_id,target_name,type,action
```
Move the rows with `SN-Move-Records-To-Update-Set`.

### Script Times Out

**Symptom:** Partial execution, timeout error
**Causes:**
- Too many records processed
- Inefficient queries
**Solution:**
- Add setLimit()
- Use batch processing pattern
- Optimize queries with proper indexes

### No Logs Appearing

**Symptom:** A sys_trigger run completes but no gs.info() output is visible
**Causes:**
- Log level filtering
- Looking in wrong time range
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sys_created_on>javascript:gs.minutesAgo(10)
  fields: message,level,source,sys_created_on
  limit: 50
```

## Related Skills

- `admin/batch-operations` - Bulk record operations
- `admin/update-set-management` - Track script changes
- `admin/deployment-workflow` - Deploy scripts between instances

## References

- [ServiceNow Script Execution](https://docs.servicenow.com/bundle/utah-platform-administration/page/script/scripts-background/concept/c_ScriptsBackground.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [System Logs](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/reference-pages/concept/c_SystemLogs.html)
