---
name: incident-summarization
version: 1.0.0
description: Generate comprehensive incident summaries with timeline, impact assessment, actions taken, and resolution details
author: Happy Technologies LLC
tags: [itsm, incident, summarization, timeline, impact, resolution, reporting, itil]
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
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_audit
    - /api/now/table/change_request
    - /api/now/table/problem
    - /api/now/table/task_ci
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Incident Summarization

## Overview

This skill provides a structured approach to generating comprehensive incident summaries in ServiceNow ITSM. It covers:

- Building chronological timelines from incident journal entries and audit trails
- Assessing business impact including affected users, services, and SLA implications
- Cataloging diagnostic and remediation actions taken during incident handling
- Documenting root cause findings and resolution details
- Generating post-incident reports for stakeholder communication
- Creating executive summaries for major incident reviews

**When to use:** When incidents need to be summarized for handoff, closure, post-incident review, management reporting, or knowledge article creation. Particularly valuable for major incidents with extensive activity logs.

**Plugin required:** `com.snc.incident` (Incident Management)

## Prerequisites

- **Roles:** `itil`, `incident_manager`, or `admin`
- **Access:** Read access to `incident`, `sys_journal_field`, `sys_audit`, `change_request`, `problem`
- **Knowledge:** Familiarity with ITIL incident lifecycle, SLA management, and incident reporting requirements
- **Plugins:** `com.snc.incident` must be activated

## Procedure

### Step 1: Retrieve the Incident Record

Pull the complete incident record for context.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  fields: sys_id,number,short_description,description,state,impact,urgency,priority,category,subcategory,assignment_group,assigned_to,opened_by,opened_at,resolved_by,resolved_at,closed_at,close_code,close_notes,business_service,cmdb_ci,caller_id,contact_type,escalation,severity,reopen_count,reassignment_count,business_duration,calendar_duration
```

**Using REST API:**
```bash
GET /api/now/table/incident/[incident_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,impact,urgency,priority,category,subcategory,assignment_group,assigned_to,opened_by,opened_at,resolved_by,resolved_at,closed_at,close_code,close_notes,business_service,cmdb_ci,caller_id,contact_type,escalation,severity,reopen_count,reassignment_count,business_duration,calendar_duration&sysparm_display_value=true
```

### Step 2: Build the Activity Timeline

Extract work notes and comments to construct a chronological timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[incident_sys_id]^name=incident^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_by,sys_created_on
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[incident_sys_id]^name=incident^elementINwork_notes,comments^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_by,sys_created_on&sysparm_display_value=true&sysparm_limit=100
```

### Step 3: Track State Changes and Assignments

Review the audit trail for state transitions, priority changes, and reassignments.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=incident^documentkey=[incident_sys_id]^fieldnameINstate,priority,impact,urgency,assigned_to,assignment_group,escalation^ORDERBYsys_created_on
  fields: sys_id,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_audit?sysparm_query=tablename=incident^documentkey=[incident_sys_id]^fieldnameINstate,priority,impact,urgency,assigned_to,assignment_group,escalation^ORDERBYsys_created_on&sysparm_fields=sys_id,fieldname,oldvalue,newvalue,user,sys_created_on&sysparm_display_value=true&sysparm_limit=50
```

### Step 4: Identify Affected CIs and Services

Determine the infrastructure and services impacted by the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_ci
  query: task=[incident_sys_id]
  fields: sys_id,ci_item,ci_item.name,ci_item.sys_class_name,ci_item.operational_status
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/task_ci?sysparm_query=task=[incident_sys_id]&sysparm_fields=sys_id,ci_item,ci_item.name,ci_item.sys_class_name,ci_item.operational_status&sysparm_display_value=true&sysparm_limit=20
```

### Step 5: Check Related Records

Find related changes, problems, or child incidents.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: reason=[incident_sys_id]^ORcorrelation_id=[incident_number]
  fields: sys_id,number,short_description,state,type,start_date,end_date
  limit: 10
```

```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: sys_id=[problem_id_from_incident]
  fields: sys_id,number,short_description,state,root_cause,fix,workaround
  limit: 5
```

### Step 6: Generate the Comprehensive Summary

Compile all data into a structured incident summary.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate a comprehensive incident summary
  script: |
    var incId = '[incident_sys_id]';

    var inc = new GlideRecord('incident');
    inc.get(incId);

    gs.info('=== INCIDENT SUMMARY ===');
    gs.info('Incident: ' + inc.number);
    gs.info('Title: ' + inc.short_description);
    gs.info('State: ' + inc.state.getDisplayValue());
    gs.info('Priority: ' + inc.priority.getDisplayValue() + ' (Impact: ' + inc.impact.getDisplayValue() + ' / Urgency: ' + inc.urgency.getDisplayValue() + ')');

    // Duration
    gs.info('\n--- DURATION ---');
    gs.info('Opened: ' + inc.opened_at);
    gs.info('Resolved: ' + inc.resolved_at);
    gs.info('Closed: ' + inc.closed_at);
    gs.info('Business Duration: ' + inc.business_duration.getDisplayValue());
    gs.info('Calendar Duration: ' + inc.calendar_duration.getDisplayValue());

    // Impact
    gs.info('\n--- IMPACT ---');
    gs.info('Service: ' + inc.business_service.getDisplayValue());
    gs.info('CI: ' + inc.cmdb_ci.getDisplayValue());
    gs.info('Caller: ' + inc.caller_id.getDisplayValue());

    // Get affected CI count
    var ciCount = new GlideAggregate('task_ci');
    ciCount.addQuery('task', incId);
    ciCount.addAggregate('COUNT');
    ciCount.query();
    ciCount.next();
    gs.info('Affected CIs: ' + ciCount.getAggregate('COUNT'));

    // Assignment history
    gs.info('\n--- ASSIGNMENT HISTORY ---');
    var assign = new GlideRecord('sys_audit');
    assign.addQuery('tablename', 'incident');
    assign.addQuery('documentkey', incId);
    assign.addQuery('fieldname', 'assignment_group');
    assign.orderBy('sys_created_on');
    assign.query();
    while (assign.next()) {
      gs.info(assign.sys_created_on + ': ' + assign.oldvalue + ' -> ' + assign.newvalue + ' (by ' + assign.user + ')');
    }
    gs.info('Reassignment Count: ' + inc.reassignment_count);

    // Key activities (work notes summary)
    gs.info('\n--- KEY ACTIVITIES ---');
    var notes = new GlideRecord('sys_journal_field');
    notes.addQuery('element_id', incId);
    notes.addQuery('name', 'incident');
    notes.addQuery('element', 'work_notes');
    notes.orderBy('sys_created_on');
    notes.query();

    var noteNum = 0;
    while (notes.next()) {
      noteNum++;
      var text = notes.value.toString().replace(/<[^>]*>/g, '').substring(0, 150);
      gs.info('[' + notes.sys_created_on + ' | ' + notes.sys_created_by + '] ' + text);
    }
    gs.info('Total Work Notes: ' + noteNum);

    // Resolution
    gs.info('\n--- RESOLUTION ---');
    gs.info('Close Code: ' + inc.close_code.getDisplayValue());
    gs.info('Close Notes: ' + inc.close_notes);
    gs.info('Resolved By: ' + inc.resolved_by.getDisplayValue());
    gs.info('Reopen Count: ' + inc.reopen_count);

    // Related problem
    if (inc.problem_id && inc.problem_id.toString() !== '') {
      gs.info('\n--- RELATED PROBLEM ---');
      var prob = inc.problem_id.getRefRecord();
      gs.info('Problem: ' + prob.number + ' | ' + prob.short_description);
      gs.info('Root Cause: ' + prob.root_cause);
    }
```

### Step 7: Generate Executive Summary

Create a concise executive-level summary for leadership reporting.

**Executive Summary Template:**

```
=== EXECUTIVE INCIDENT SUMMARY ===

INCIDENT: [Number] - [Short Description]
SEVERITY: [Priority] | STATUS: [State]
DURATION: [Business Duration]

BUSINESS IMPACT:
- Service Affected: [Business Service]
- Users Impacted: [Estimated count]
- Revenue Impact: [If applicable]

ROOT CAUSE:
[Brief root cause description]

RESOLUTION:
[Resolution summary in 1-2 sentences]

CORRECTIVE ACTIONS:
1. [Immediate fix applied]
2. [Preventive measure planned]
3. [Related change/problem raised]

TIMELINE:
[Time] - Incident detected
[Time] - Initial response
[Time] - Escalated to [team]
[Time] - Root cause identified
[Time] - Resolution applied
[Time] - Service restored
```

### Step 8: Save the Summary

Post the summary as a work note or update close notes.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  work_notes: |
    === INCIDENT SUMMARY ===
    [Generated summary content]

    Timeline: [X] key events over [Y] hours
    Reassignments: [count]
    Work Notes: [count] entries
    Related: [Problem/Change numbers]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve full incident record |
| `SN-Query-Table` | Query journal entries, audit trail, related records, affected CIs |
| `SN-NL-Search` | Find similar incidents or related knowledge |
| `SN-Update-Record` | Update close notes with summary |
| `SN-Add-Work-Notes` | Post summary as work note |
| `SN-Execute-Background-Script` | Generate comprehensive multi-source summaries |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET/PATCH | Read incident and update close notes |
| `/api/now/table/sys_journal_field` | GET | Extract work notes and comments |
| `/api/now/table/sys_audit` | GET | Track state changes and assignments |
| `/api/now/table/task_ci` | GET | Identify affected CIs |
| `/api/now/table/change_request` | GET | Find related changes |
| `/api/now/table/problem` | GET | Find related problems |

## Best Practices

- **Capture the Why:** Focus on why decisions were made, not just what happened; this is critical for post-incident reviews
- **Quantify Impact:** Include metrics such as affected users, downtime duration, and SLA impact percentage
- **Link Related Records:** Always reference related problems, changes, and knowledge articles for traceability
- **Summarize Progressively:** For long-running incidents, create interim summaries at key milestones
- **Use Consistent Format:** Standardize summary templates across the organization for easy comparison
- **Time-Stamp Everything:** Precise timestamps enable accurate SLA calculations and timeline reconstruction

## Troubleshooting

### Work Notes Missing or Incomplete

**Cause:** Agents used comments instead of work notes, or notes were added via email which may have different formatting
**Solution:** Query both `work_notes` and `comments` elements. Check `sys_email` for any email-based communications.

### Audit Trail Gaps

**Cause:** Some field changes may not be audited, or audit records may have been purged
**Solution:** Verify audit policies for the incident table. Check `sys_audit_delete` for purge history. Supplement with journal entries.

### Duration Calculations Incorrect

**Cause:** Business duration excludes non-business hours; clock may have been paused during pending states
**Solution:** Use `calendar_duration` for total elapsed time. Check for state transitions to/from "Awaiting User Info" or "Pending" states.

### Related Records Not Found

**Cause:** Records linked via different fields or correlation IDs not set
**Solution:** Search by incident number in `short_description` or `description` fields of change/problem records. Check `correlation_id` and `parent_incident` fields.

## Examples

### Example 1: Post-Incident Review Summary

```
# 1. Get incident
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: [sys_id]
  fields: number,short_description,priority,impact,opened_at,resolved_at,close_notes,business_service

# 2. Get timeline
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[sys_id]^name=incident^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_by,sys_created_on
  limit: 50

# 3. Get state changes
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=incident^documentkey=[sys_id]^fieldname=state^ORDERBYsys_created_on
  fields: oldvalue,newvalue,user,sys_created_on
  limit: 20
```

### Example 2: Batch Summarization of Open P1 Incidents

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Summarize all open P1 incidents
  script: |
    var gr = new GlideRecord('incident');
    gr.addQuery('priority', '1');
    gr.addQuery('active', true);
    gr.query();

    gs.info('=== OPEN P1 INCIDENT SUMMARY ===');
    gs.info('Total: ' + gr.getRowCount());

    while (gr.next()) {
      var age = gs.dateDiff(gr.opened_at.toString(), gs.nowDateTime(), true);
      gs.info(gr.number + ' | ' + gr.short_description + ' | Age: ' + age + ' | Group: ' + gr.assignment_group.getDisplayValue() + ' | Service: ' + gr.business_service.getDisplayValue());
    }
```

### Example 3: SLA Impact Summary

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_id=[sys_id]
  fields: number,sla_due,made_sla,business_duration,calendar_duration,priority
  limit: 1
```

## Related Skills

- `itsm/major-incident` - Specialized summarization for major incidents
- `itsm/problem-analysis` - Root cause analysis referenced in summaries
- `itsm/kb-generation` - Convert incident summaries to knowledge articles
- `itsm/email-recommendation` - Send summary-based communications to stakeholders
- `reporting/trend-analysis` - Aggregate incident summaries for trend reporting

## References

- [ServiceNow Incident Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_IncidentManagement.html)
- [Post-Incident Review](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/task/t_ReviewAnIncident.html)
- [SLA Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-level-management/concept/c_ServiceLevelManagement.html)
