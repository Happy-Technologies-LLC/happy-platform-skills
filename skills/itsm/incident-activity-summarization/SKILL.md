---
name: incident-activity-summarization
version: 1.0.0
description: Summarize incident activity streams including work notes, comments, state changes, assignment history, and communications into concise narratives for handoffs, escalations, and management reviews
author: Happy Technologies LLC
tags: [itsm, incident, summarization, activity, work-notes, state-changes, assignment-history, handoff, zero-touch]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-NL-Search
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_audit
    - /api/now/table/task_sla
    - /api/now/table/sys_history_line
    - /api/now/table/incident_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Activity Summarization

## Overview

This skill generates concise narrative summaries of incident activity streams for ServiceNow ITSM:

- Consolidating work notes, additional comments, and journal entries into a coherent timeline
- Tracking state transitions with timestamps, durations, and responsible parties
- Mapping assignment changes across groups and individuals
- Highlighting key decision points, escalation triggers, and resolution attempts
- Generating handoff-ready summaries for shift changes and team transitions
- Creating management-friendly executive narratives for major incidents
- Producing SLA-aware summaries that flag breaches and at-risk timelines

**When to use:** When agents need to quickly understand an incident's history during handoff, when managers need status updates on active incidents, when producing post-incident documentation, or when building zero-touch service desk automation that auto-summarizes activity.

## Prerequisites

- **Roles:** `itil`, `incident_manager`, or `admin`
- **Plugins:** `com.glideapp.itil` (ITSM)
- **Access:** Read access to `incident`, `sys_journal_field`, `sys_audit`, `task_sla`
- **Knowledge:** Incident lifecycle states, SLA concepts, assignment group structure
- **Related Skills:** `itsm/incident-lifecycle` for state management, `itsm/major-incident` for P1 processes

## Procedure

### Step 1: Retrieve the Incident Record

Fetch the core incident details for context.

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: <incident_sys_id>
  fields: sys_id,number,short_description,description,state,priority,impact,urgency,category,subcategory,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolved_by,closed_at,closed_by,caller_id,cmdb_ci,contact_type,reopen_count,reassignment_count,escalation,sys_updated_on
```

**REST Approach:**
```
GET /api/now/table/incident/<incident_sys_id>
  ?sysparm_fields=sys_id,number,short_description,description,state,priority,impact,urgency,category,subcategory,assigned_to,assignment_group,opened_at,resolved_at,closed_at,caller_id,cmdb_ci,reopen_count,reassignment_count,escalation
  &sysparm_display_value=true
```

### Step 2: Retrieve Work Notes and Comments

Fetch all journal entries (work notes and additional comments) for the incident.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<incident_sys_id>^elementIN(work_notes,comments)^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 200
```

**REST Approach:**
```
GET /api/now/table/sys_journal_field
  ?sysparm_query=element_id=<incident_sys_id>^elementIN(work_notes,comments)^ORDERBYsys_created_on
  &sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by
  &sysparm_limit=200
```

### Step 3: Retrieve State Change History

Track all state transitions with timestamps using the audit log.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: documentkey=<incident_sys_id>^fieldname=state^ORDERBYsys_created_on
  fields: sys_id,oldvalue,newvalue,sys_created_on,user
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/sys_audit
  ?sysparm_query=documentkey=<incident_sys_id>^fieldname=state^ORDERBYsys_created_on
  &sysparm_fields=sys_id,oldvalue,newvalue,sys_created_on,user
  &sysparm_display_value=true
  &sysparm_limit=50
```

### Step 4: Retrieve Assignment History

Track who has worked on the incident and for how long.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: documentkey=<incident_sys_id>^fieldnameINassigned_to,assignment_group^ORDERBYsys_created_on
  fields: sys_id,fieldname,oldvalue,newvalue,sys_created_on,user
  limit: 50
```

### Step 5: Retrieve SLA Status

Check all SLA records associated with the incident.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=<incident_sys_id>
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,start_time,end_time,pause_duration,pause_time
  limit: 10
```

**REST Approach:**
```
GET /api/now/table/task_sla
  ?sysparm_query=task=<incident_sys_id>
  &sysparm_fields=sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,start_time,end_time
  &sysparm_display_value=true
  &sysparm_limit=10
```

### Step 6: Build the Activity Timeline

Merge all data sources into a unified chronological timeline:

```
=== INCIDENT ACTIVITY TIMELINE ===
Incident: INC0067890 - Production database connection pool exhaustion
Priority: P1 - Critical | State: Resolved
Duration: 4 hours 23 minutes (Opened to Resolved)

[2025-12-10 02:15] OPENED by Monitoring System (auto-created)
  - Source: Event Management alert
  - Description: Connection pool on prod-db-01 exceeded 95% threshold
  - Auto-assigned to: Database Administration (DBA Team)

[2025-12-10 02:17] WORK NOTE by System
  - "Related alert: CPU utilization on prod-db-01 at 92%"
  - "3 dependent services affected: Order Processing, User Auth, Reporting"

[2025-12-10 02:25] STATE: New -> In Progress
  - Assigned to: Mike Chen (DBA Team)
  - Work note: "Investigating connection pool metrics. Current active
    connections: 485/500. Identifying top consumers."

[2025-12-10 02:42] WORK NOTE by Mike Chen
  - "Root cause identified: Reporting batch job spawning excessive connections.
    Job ID: RPT-NIGHTLY-2025121001. Normally runs 50 connections, currently
    holding 280 connections due to long-running query."

[2025-12-10 02:55] ESCALATION triggered (P1 > 30 min without resolution)
  - Notification sent to: DBA Manager (Sarah Kim)

[2025-12-10 03:10] WORK NOTE by Mike Chen
  - "Killed the runaway reporting query (PID 45678). Connection pool
    dropping. Currently at 310/500. Waiting for connections to release."

[2025-12-10 03:15] COMMENT by Sarah Kim (Manager)
  - "Monitoring the situation. Is there a risk of recurrence tonight?"

[2025-12-10 03:20] WORK NOTE by Mike Chen
  - "Disabled the nightly reporting job to prevent recurrence. Will
    coordinate with Reporting team to fix the query before re-enabling.
    Connection pool now at 180/500 - within normal range."

[2025-12-10 03:45] WORK NOTE by Mike Chen
  - "All dependent services confirmed operational. Order Processing,
    User Auth, and Reporting dashboard all responding normally."

[2025-12-10 04:00] ASSIGNMENT changed: Mike Chen -> Lisa Park (for monitoring)
  - Shift handoff: Mike Chen end of on-call rotation

[2025-12-10 06:38] STATE: In Progress -> Resolved
  - Resolved by: Lisa Park
  - Resolution: "Runaway reporting query killed, connection pool restored.
    Nightly job disabled pending query optimization. Change CHG0012345
    created for permanent fix."
```

### Step 7: Generate Narrative Summary

Convert the timeline into a readable narrative:

```
=== NARRATIVE SUMMARY ===
Incident INC0067890 was a P1 critical issue involving production database
connection pool exhaustion on prod-db-01. The incident was auto-created
by Event Management at 02:15 on December 10, 2025, when the connection
pool exceeded the 95% threshold.

DBA team member Mike Chen began investigation at 02:25 and identified
the root cause within 17 minutes: a nightly reporting batch job had
spawned 280 connections (normally 50) due to a long-running query. Three
dependent services were impacted: Order Processing, User Auth, and
Reporting.

The runaway query was terminated at 03:10, and the connection pool
returned to normal levels (180/500) by 03:20. The nightly reporting job
was disabled as a preventive measure. All dependent services were
confirmed operational by 03:45.

The incident was handed off to Lisa Park at 04:00 during shift rotation
and formally resolved at 06:38. Total resolution time was 4 hours 23
minutes. A change request (CHG0012345) was created for the permanent
fix (query optimization).

KEY METRICS:
- Time to Acknowledge: 10 minutes
- Time to Root Cause: 27 minutes
- Time to Mitigate: 55 minutes
- Time to Resolve: 4 hours 23 minutes
- Reassignment Count: 1 (shift handoff)
- SLA Status: Response SLA met, Resolution SLA met
```

### Step 8: Generate Handoff Summary

Create a condensed summary optimized for shift handoffs:

```
=== SHIFT HANDOFF SUMMARY ===
Incident: INC0067890 - DB Connection Pool Exhaustion (P1)

CURRENT STATE: Resolved (monitoring)
WHAT HAPPENED: Reporting batch job consumed 280 DB connections (limit 500),
  causing service degradation for 3 dependent apps.
WHAT WAS DONE: Killed runaway query, disabled nightly job, pool recovered.
WHAT REMAINS: Monitor for recurrence. Reporting job stays disabled until
  CHG0012345 (query optimization) is implemented.
RISK: Low - root cause addressed. If pool spikes again, kill reporting
  connections first (see work note at 02:42 for query identification steps).
CONTACTS: Mike Chen (original responder), Sarah Kim (manager, notified).
```

### Step 9: Generate Executive Summary

Create a management-friendly overview:

```
=== EXECUTIVE SUMMARY ===
INC0067890 | P1 Critical | RESOLVED

A production database capacity issue caused temporary degradation to three
business services (Order Processing, User Authentication, Reporting) for
approximately 90 minutes on December 10. The issue was caused by a
misconfigured batch reporting job and was resolved without data loss or
customer impact. A permanent fix is scheduled via change request CHG0012345.

Impact: 3 internal services, no customer-facing impact
Duration: 90 minutes (service degradation), 4h23m (total incident lifecycle)
Root Cause: Software defect in reporting batch job
Prevention: Change request filed for query optimization
```

### Step 10: Attach Summary to Incident

Save the generated summary as a work note.

**MCP Approach:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: incident
  sys_id: <incident_sys_id>
  work_notes: "[AI-Generated Activity Summary]\n\n<narrative summary>"
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Get-Record | Retrieve incident record details | Initial context gathering |
| SN-Query-Table | Fetch journal entries, audit trail, SLA records | Activity data retrieval |
| SN-NL-Search | Find related incidents by description | Cross-incident pattern analysis |
| SN-Add-Work-Notes | Attach generated summary to incident | Documentation and handoff |

## Best Practices

1. **Merge all data sources chronologically** -- work notes, state changes, and assignments in one timeline
2. **Distinguish work notes from comments** -- work notes are internal, comments are customer-visible
3. **Calculate time-in-state** -- show how long the incident spent in each state
4. **Highlight root cause clearly** -- the most important finding should be prominent
5. **Include what remains to be done** -- handoff summaries must cover outstanding actions
6. **Flag SLA breaches prominently** -- breaches should be visible at the top of any summary
7. **Use business-friendly language** -- executive summaries should avoid technical jargon
8. **Note reassignment patterns** -- excessive reassignments indicate routing issues
9. **Include related records** -- link to change requests, problem records, or related incidents
10. **Timestamp all entries** -- every activity must have a clear timestamp for audit purposes

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Journal entries missing | Retention policy purged old entries | Check `sys_journal_field` retention; data may be in archive |
| Audit records incomplete | Auditing not enabled for all fields | Verify audit configuration in `sys_dictionary` |
| State changes not tracked | State field not audited | Enable auditing on the `state` field in dictionary |
| SLA records missing | No SLA definitions for this priority/category | Check SLA definitions in `contract_sla` |
| Assignment history gaps | Assignment changes not audited | Enable auditing on `assigned_to` and `assignment_group` |
| Timeline out of order | Time zone mismatch in queries | Use UTC consistently and convert for display |

## Examples

### Example 1: Shift Handoff Summary

**Input:** "Summarize all activity on INC0067890 for the incoming shift"

**Steps:** Retrieve incident, fetch all journal entries and state changes, identify last 4 hours of activity, generate condensed handoff summary with current state, pending actions, and risk assessment.

### Example 2: Major Incident Executive Report

**Input:** "Generate an executive summary of the P1 incident INC0067890 for the CTO"

**Steps:** Retrieve incident and all activity, calculate key metrics (time to detect, respond, resolve), assess business impact, generate executive-level narrative without technical details, include prevention measures.

### Example 3: Bulk Activity Summary for Daily Standup

**Input:** "Summarize all P1 and P2 incidents from the last 24 hours"

**Steps:** Query incidents opened or updated in the last 24 hours with priority 1 or 2, generate brief (3-5 line) summary for each, include current state and owner, aggregate metrics (total incidents, resolved count, still open count).

## Related Skills

- `itsm/incident-lifecycle` - Incident state management and lifecycle
- `itsm/major-incident` - Major incident management process
- `itsm/incident-triage` - Incident categorization and routing
- `reporting/sla-analysis` - SLA performance analysis
- `itsm/quick-reference` - ITSM field and state reference
