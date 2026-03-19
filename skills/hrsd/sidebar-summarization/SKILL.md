---
name: hr-sidebar-summarization
version: 1.0.0
description: Generate sidebar discussion summaries for HR cases with key decision points, stakeholder input, and next actions
author: Happy Technologies LLC
tags: [hrsd, summarization, sidebar, discussion, decisions, next-actions, hr-cases, collaboration]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Add-Work-Notes
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_audit
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# HR Sidebar Discussion Summarization

## Overview

This skill provides a structured approach to generating concise sidebar summaries for HR service delivery cases. It covers:

- Extracting and condensing lengthy case discussion threads into actionable summaries
- Identifying key decision points made during case handling
- Highlighting stakeholder contributions and their roles in the discussion
- Capturing next actions and pending items requiring follow-up
- Producing formatted summaries suitable for sidebar display or quick reference
- Supporting handoff scenarios where a new agent needs rapid context

**When to use:** When HR cases have extensive discussion threads and agents need a quick overview of what has been discussed, decided, and what remains to be done. Particularly valuable during shift handoffs, manager escalations, or when multiple HR specialists collaborate on a case.

**Plugin required:** `com.sn_hr_core` (HR Service Delivery Core)

## Prerequisites

- **Roles:** `sn_hr_core.case_reader`, `sn_hr_core.case_writer`, or `sn_hr_core.admin`
- **Access:** Read access to `sn_hr_core_case`, `sys_journal_field`, `sys_audit`
- **Knowledge:** Familiarity with HR case lifecycle states, escalation processes, and organizational HR structure
- **Plugins:** `com.sn_hr_core` must be activated

## Procedure

### Step 1: Retrieve the HR Case Record

Pull the case header information to establish context.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  fields: sys_id,number,short_description,description,state,priority,hr_service,subject_person,subject_person.name,assigned_to,assignment_group,opened_at,sys_updated_on,escalation,active
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case/[case_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,priority,hr_service,subject_person,assigned_to,assignment_group,opened_at,sys_updated_on,escalation,active&sysparm_display_value=true
```

### Step 2: Extract Discussion Thread (Work Notes and Comments)

Retrieve all journal entries (work notes and additional comments) for the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^name=sn_hr_core_case^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_by,sys_created_on
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^name=sn_hr_core_case^elementINwork_notes,comments^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_by,sys_created_on&sysparm_display_value=true&sysparm_limit=100
```

### Step 3: Retrieve Related Tasks

Pull associated HR tasks that provide additional context on actions taken.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_task
  query: parent=[case_sys_id]^ORDERBYsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,opened_at,closed_at,close_notes,work_notes
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_task?sysparm_query=parent=[case_sys_id]^ORDERBYsys_created_on&sysparm_fields=sys_id,number,short_description,state,assigned_to,opened_at,closed_at,close_notes,work_notes&sysparm_display_value=true&sysparm_limit=20
```

### Step 4: Track State Changes and Escalations

Review the audit trail to understand how the case progressed.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sn_hr_core_case^documentkey=[case_sys_id]^fieldnameINstate,priority,assigned_to,assignment_group,escalation^ORDERBYsys_created_on
  fields: sys_id,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_audit?sysparm_query=tablename=sn_hr_core_case^documentkey=[case_sys_id]^fieldnameINstate,priority,assigned_to,assignment_group,escalation^ORDERBYsys_created_on&sysparm_fields=sys_id,fieldname,oldvalue,newvalue,user,sys_created_on&sysparm_display_value=true&sysparm_limit=50
```

### Step 5: Generate the Sidebar Summary

Compile the extracted data into a structured sidebar summary.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate a structured sidebar summary for an HR case
  script: |
    var caseId = '[case_sys_id]';

    gs.info('=== HR CASE SIDEBAR SUMMARY ===');

    // Case header
    var caseGr = new GlideRecord('sn_hr_core_case');
    caseGr.get(caseId);
    gs.info('Case: ' + caseGr.number + ' | ' + caseGr.short_description);
    gs.info('State: ' + caseGr.state.getDisplayValue() + ' | Priority: ' + caseGr.priority.getDisplayValue());
    gs.info('Subject: ' + caseGr.subject_person.getDisplayValue());
    gs.info('Assigned: ' + caseGr.assigned_to.getDisplayValue() + ' (' + caseGr.assignment_group.getDisplayValue() + ')');
    gs.info('Opened: ' + caseGr.opened_at + ' | Updated: ' + caseGr.sys_updated_on);

    // Discussion summary - key entries
    gs.info('\n--- KEY DISCUSSION POINTS ---');
    var journal = new GlideRecord('sys_journal_field');
    journal.addQuery('element_id', caseId);
    journal.addQuery('name', 'sn_hr_core_case');
    journal.addQuery('element', 'work_notes');
    journal.orderBy('sys_created_on');
    journal.query();

    var noteCount = 0;
    while (journal.next()) {
      noteCount++;
      var noteText = journal.value.toString().replace(/<[^>]*>/g, '').substring(0, 200);
      gs.info('[' + journal.sys_created_on + ' | ' + journal.sys_created_by + '] ' + noteText);
    }
    gs.info('Total work notes: ' + noteCount);

    // State transitions
    gs.info('\n--- STATE TRANSITIONS ---');
    var audit = new GlideRecord('sys_audit');
    audit.addQuery('tablename', 'sn_hr_core_case');
    audit.addQuery('documentkey', caseId);
    audit.addQuery('fieldname', 'state');
    audit.orderBy('sys_created_on');
    audit.query();

    while (audit.next()) {
      gs.info(audit.sys_created_on + ': ' + audit.oldvalue + ' -> ' + audit.newvalue + ' (by ' + audit.user + ')');
    }

    // Related tasks status
    gs.info('\n--- RELATED TASKS ---');
    var task = new GlideRecord('sn_hr_core_task');
    task.addQuery('parent', caseId);
    task.orderBy('sys_created_on');
    task.query();

    while (task.next()) {
      gs.info(task.number + ': ' + task.short_description + ' | State: ' + task.state.getDisplayValue() + ' | Assigned: ' + task.assigned_to.getDisplayValue());
    }

    // Pending actions
    gs.info('\n--- PENDING ACTIONS ---');
    var pending = new GlideRecord('sn_hr_core_task');
    pending.addQuery('parent', caseId);
    pending.addQuery('state', '!=', 'closed_complete');
    pending.addQuery('state', '!=', 'closed_incomplete');
    pending.query();

    if (!pending.hasNext()) {
      gs.info('No pending tasks.');
    }
    while (pending.next()) {
      gs.info('ACTION NEEDED: ' + pending.short_description + ' | Assigned: ' + pending.assigned_to.getDisplayValue());
    }
```

### Step 6: Format the Summary for Sidebar Display

Structure the output into a concise sidebar format.

**Sidebar Summary Template:**

```
=== CASE SUMMARY ===
[Case Number] - [Short Description]
Status: [State] | Priority: [Priority]
Employee: [Subject Person] | Dept: [Department]
Agent: [Assigned To] | Group: [Assignment Group]
Age: [Days since opened]

=== KEY DECISIONS ===
1. [Date] - [Decision description] (by [Person])
2. [Date] - [Decision description] (by [Person])
3. [Date] - [Decision description] (by [Person])

=== STAKEHOLDER INPUT ===
- [Person/Role]: [Summary of their contribution]
- [Person/Role]: [Summary of their contribution]

=== TIMELINE ===
[Date] - Case opened
[Date] - [Key event]
[Date] - [Key event]
[Date] - Current state reached

=== NEXT ACTIONS ===
[ ] [Action item 1] - Assigned to [Person]
[ ] [Action item 2] - Assigned to [Person]
[x] [Completed action] - Done by [Person]
```

### Step 7: Save the Summary to the Case

Attach the generated summary as a work note for team visibility.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  work_notes: |
    === SIDEBAR DISCUSSION SUMMARY ===
    Generated: [current date/time]

    KEY DECISIONS:
    1. [Decision summary]
    2. [Decision summary]

    STAKEHOLDERS:
    - [Name]: [Input summary]

    NEXT ACTIONS:
    - [Pending action 1]
    - [Pending action 2]

    CASE AGE: [X] days | NOTES: [count] entries
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve HR case header details |
| `SN-Query-Table` | Query journal entries, audit trail, related tasks |
| `SN-NL-Search` | Natural language queries for case context |
| `SN-Update-Record` | Update case with summary or state changes |
| `SN-Add-Work-Notes` | Post the summary as a work note |
| `SN-Execute-Background-Script` | Generate comprehensive summaries from multiple data sources |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_case` | GET/PATCH | Read case details and update with summary |
| `/api/now/table/sn_hr_core_task` | GET | Review related tasks and pending actions |
| `/api/now/table/sys_journal_field` | GET | Extract work notes and comments |
| `/api/now/table/sys_audit` | GET | Track state changes and escalation history |
| `/api/now/table/sn_hr_le_case_type` | GET | Understand case type context |

## Best Practices

- **Focus on Decisions:** Highlight what was decided, not every comment; agents need actionable context
- **Identify Blockers:** Clearly flag any pending actions or approvals that are holding up the case
- **Preserve Chronology:** Present events in chronological order to show how the case evolved
- **Attribute Contributions:** Note who made key decisions or provided input for accountability
- **Keep It Concise:** Sidebar summaries should be scannable in 30 seconds; avoid lengthy prose
- **Respect Privacy:** Summarize sensitive details at a high level; do not reproduce PII in summaries

## Troubleshooting

### No Work Notes Found

**Cause:** Case communication happened through comments (visible to employee) rather than work notes (internal)
**Solution:** Query both `work_notes` and `comments` elements from `sys_journal_field`. Combine both for a complete picture.

### Audit Trail Missing State Changes

**Cause:** Audit policies may not track all fields or auditing may be disabled for certain fields
**Solution:** Check System Audit configuration for the `sn_hr_core_case` table. Verify that `state`, `priority`, and `assigned_to` fields are audited.

### Summary Too Long for Sidebar Display

**Cause:** Case has extensive discussion spanning many weeks or contributors
**Solution:** Limit the summary to the most recent 5-7 key events. Focus on decisions and pending actions rather than verbose note content.

### Related Tasks Not Appearing

**Cause:** Tasks may be on a different table or linked through a different relationship field
**Solution:** Check `sn_hr_core_task.parent` field matches the case sys_id. Also query for tasks linked via `parent.parent` for nested task structures.

## Examples

### Example 1: Quick Handoff Summary

```
# 1. Get case details
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  fields: number,short_description,state,priority,assigned_to,assignment_group,opened_at

# 2. Get recent work notes (last 5)
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^name=sn_hr_core_case^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_by,sys_created_on
  limit: 5

# 3. Get pending tasks
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_task
  query: parent=[case_sys_id]^stateNOT INclosed_complete,closed_incomplete
  fields: number,short_description,state,assigned_to
  limit: 10
```

### Example 2: Escalation Context Summary

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sn_hr_core_case^documentkey=[case_sys_id]^fieldnameINstate,priority,escalation,assignment_group^ORDERBYsys_created_on
  fields: fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 30
```

### Example 3: Multi-Case Summary for Manager Review

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Summarize all open cases for a specific HR team
  script: |
    var groupName = 'HR Benefits Team';
    var gr = new GlideRecord('sn_hr_core_case');
    gr.addQuery('assignment_group.name', groupName);
    gr.addQuery('active', true);
    gr.orderBy('priority');
    gr.query();

    gs.info('=== TEAM CASE SUMMARY: ' + groupName + ' ===');
    gs.info('Open Cases: ' + gr.getRowCount());

    while (gr.next()) {
      var taskCount = new GlideAggregate('sn_hr_core_task');
      taskCount.addQuery('parent', gr.sys_id.toString());
      taskCount.addQuery('active', true);
      taskCount.addAggregate('COUNT');
      taskCount.query();
      taskCount.next();
      var pending = taskCount.getAggregate('COUNT');

      gs.info(gr.number + ' | P' + gr.priority + ' | ' + gr.state.getDisplayValue() + ' | ' + gr.short_description + ' | Pending Tasks: ' + pending);
    }
```

## Related Skills

- `hrsd/email-recommendation` - Draft email responses based on sidebar summary context
- `hrsd/kb-generation` - Convert recurring discussion patterns into knowledge articles
- `hrsd/case-summarization` - Full case summarization for closing or reporting
- `itsm/incident-summarization` - Similar summarization approach for ITSM incidents

## References

- [ServiceNow HR Case Management](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_HRCaseManagement.html)
- [Journal Fields](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/field-administration/concept/c_JournalFields.html)
- [System Audit](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/security/concept/c_Auditing.html)
