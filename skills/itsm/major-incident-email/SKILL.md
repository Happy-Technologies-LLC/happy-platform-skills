---
name: major-incident-email
version: 1.0.0
description: Generate major incident email communications including initial notification, status updates, resolution notification, and post-incident summaries for stakeholders
author: Happy Technologies LLC
tags: [itsm, incident, major-incident, email, communication, notification, stakeholder, p1]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Add-Comment
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_user_group
    - /api/now/table/task_ci
    - /api/now/table/cmdb_ci
    - /api/now/table/sys_email
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Major Incident Email Communication Generation

## Overview

This skill covers generating professional email communications for major incidents in ServiceNow:

- Creating initial notification emails that clearly convey impact, scope, and urgency
- Writing periodic status update emails with progress, actions taken, and next steps
- Generating resolution notification emails confirming service restoration
- Building post-incident summary communications with root cause and improvement actions
- Tailoring communication tone and detail level for different audiences (executive, technical, end-user)
- Maintaining consistent branding and formatting across all incident communications

**When to use:** When a major incident is declared and stakeholders need to be informed, during ongoing incident management for regular updates, when service is restored, or after the post-incident review is complete.

## Prerequisites

- **Roles:** `incident_manager`, `major_incident_manager`, `itil`, or `admin`
- **Access:** Read access to `incident`, `sys_journal_field`, `task_ci`, `cmdb_ci` tables; write access to `sys_journal_field` for documenting communications
- **Data:** An active or recently resolved major incident with populated fields
- **Related Skills:** `itsm/major-incident` for full major incident process, `development/notifications` for automated notification setup

## Procedure

### Step 1: Retrieve Incident Details

Pull all relevant incident data needed for the communication.

**MCP Approach:**
```
Tool: SN-Read-Record
Parameters:
  table_name: incident
  sys_id: [INC_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,impact,urgency,business_service,cmdb_ci,assignment_group,assigned_to,opened_at,resolved_at,closed_at,major_incident_state,business_impact,close_notes,resolution_code,u_major_incident
```

**REST Approach:**
```
GET /api/now/table/incident/[INC_SYS_ID]
  ?sysparm_fields=sys_id,number,short_description,description,state,priority,impact,urgency,business_service,cmdb_ci,assignment_group,assigned_to,opened_at,resolved_at,closed_at,major_incident_state,business_impact,close_notes
  &sysparm_display_value=true
```

### Step 2: Identify Affected Services and User Impact

Determine the full scope of impact for communication.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_ci
  query: task=[INC_SYS_ID]
  fields: ci_item,ci_item.name,ci_item.sys_class_name,ci_item.busines_criticality
  limit: 20
```

```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_id=[CI_SYS_ID]
  fields: name,sys_class_name,used_for,support_group,location,busines_criticality
```

### Step 3: Retrieve Timeline and Activity

Get the incident timeline for status updates and summaries.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[INC_SYS_ID]^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: value,element,sys_created_on,sys_created_by
  limit: 50
```

### Step 4: Identify Recipient Groups

Determine who should receive each type of communication.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_group
  query: nameINExecutive Leadership,IT Management,Service Desk,Major Incident Management
  fields: sys_id,name,email,manager
  limit: 10
```

**Communication Matrix:**

| Audience | Initial | Updates | Resolution | PIR Summary |
|----------|---------|---------|------------|-------------|
| Executive Leadership | Yes (summary) | Every 2 hrs | Yes | Yes |
| IT Management | Yes (detailed) | Every 1 hr | Yes | Yes |
| Affected Users | Yes (simplified) | Every 1 hr | Yes | No |
| Technical Teams | Yes (full detail) | Every 30 min | Yes | Yes |
| Service Desk | Yes (talking points) | Every 30 min | Yes | No |
| External Customers | Case-by-case | Every 2 hrs | Yes | Optional |

### Step 5: Generate Initial Notification Email

Create the first communication when a major incident is declared.

```
=== INITIAL NOTIFICATION EMAIL ===

Subject: [MAJOR INCIDENT] [INC Number] - [Service Name] Disruption

---

MAJOR INCIDENT NOTIFICATION

Incident: [INC Number]
Severity: Priority [1/2] - Major Incident
Declared: [date/time] [timezone]

IMPACT
[Service/System Name] is currently experiencing [outage/degradation/intermittent issues].

Affected Service: [business_service]
Impact Scope: [Approximate number of affected users/locations/regions]
Business Functions Affected: [List key affected functions]

CURRENT STATUS
Status: Investigating
Our [team/group] is actively investigating the root cause.

[If known]: Preliminary analysis indicates [brief technical indicator without
speculative root cause].

WORKAROUND
[If available]: Users can [workaround description] as a temporary measure.
[If unavailable]: No workaround is currently available.

NEXT STEPS
- Technical teams are engaged and actively troubleshooting
- A bridge call has been established for coordinated response
- Next status update will be provided by [time]

CONTACTS
Incident Commander: [Name] ([email/phone])
Service Desk: [contact info] for urgent assistance

---
Reference: [INC Number]
Classification: [Internal/Confidential]
```

### Step 6: Generate Status Update Email

Create periodic updates during the incident.

```
=== STATUS UPDATE EMAIL ===

Subject: [UPDATE #X] [INC Number] - [Service Name] - [Status]

---

MAJOR INCIDENT STATUS UPDATE #[X]

Incident: [INC Number]
Status: [Investigating / Root Cause Identified / Fix in Progress / Monitoring]
Time: [date/time] [timezone]
Duration: [time since incident declared]

CURRENT SITUATION
[1-2 sentences describing current state of the incident]

PROGRESS SINCE LAST UPDATE ([previous update time])
- [Action taken 1 and result]
- [Action taken 2 and result]
- [Key finding or diagnosis update]

ROOT CAUSE
[If identified]: The issue has been identified as [brief, non-speculative description].
[If not identified]: Root cause investigation is ongoing. [What has been ruled out].

IMPACT UPDATE
Current Impact: [Current state of impact - improved/unchanged/worsened]
Affected Users: [Updated count if changed]
[If partial restoration]: [X]% of services have been restored.

PLANNED ACTIONS
- [Next action being taken]
- [Expected outcome and timeline]

ESTIMATED TIME TO RESOLUTION
[If estimable]: We estimate service will be restored by [time estimate with caveat].
[If not estimable]: ETR is currently under assessment. We will provide an estimate
in the next update.

WORKAROUND
[Updated workaround information if available]

NEXT UPDATE
Next status update: [time] or sooner if significant progress is made.

---
Reference: [INC Number]
Incident Commander: [Name]
```

### Step 7: Generate Resolution Notification Email

Create the communication confirming service restoration.

```
=== RESOLUTION NOTIFICATION EMAIL ===

Subject: [RESOLVED] [INC Number] - [Service Name] Restored

---

MAJOR INCIDENT RESOLVED

Incident: [INC Number]
Status: RESOLVED
Service Restored: [date/time] [timezone]

SERVICE RESTORATION CONFIRMED
[Service/System Name] has been restored to normal operation.

RESOLUTION SUMMARY
Root Cause: [Clear, non-technical explanation of what caused the issue]
Resolution: [What was done to fix it]

INCIDENT TIMELINE
- [time] - Issue first reported / detected
- [time] - Major Incident declared
- [time] - Root cause identified
- [time] - Fix implemented
- [time] - Service restored and verified
Total Duration: [hours:minutes]

IMPACT SUMMARY
- Users Affected: [number]
- Services Affected: [list]
- Business Impact: [brief description]
- Duration of Impact: [duration]

WHAT WE ARE DOING TO PREVENT RECURRENCE
- [Immediate preventive action 1]
- [Immediate preventive action 2]
- A Post-Incident Review is scheduled for [date]
- Detailed findings and long-term improvements will be shared after the PIR

USER ACTION REQUIRED
[If action needed]: Please [specific user action, e.g., clear browser cache, restart VPN].
[If no action]: No user action is required. Services should function normally.

FEEDBACK
If you continue to experience issues, please contact the Service Desk at [contact info]
referencing [INC Number].

---
We apologize for any inconvenience this disruption may have caused.
Thank you for your patience during the resolution process.

Reference: [INC Number]
Incident Commander: [Name]
```

### Step 8: Generate Post-Incident Summary Email

Create the PIR summary communication for stakeholders.

```
=== POST-INCIDENT SUMMARY EMAIL ===

Subject: [PIR COMPLETE] [INC Number] - Post-Incident Review Summary

---

POST-INCIDENT REVIEW SUMMARY

Incident: [INC Number] - [Short Description]
PIR Completed: [date]
PIR Attendees: [list of key participants]

INCIDENT OVERVIEW
On [date], [Service Name] experienced [type of disruption] lasting [duration].
The incident affected approximately [number] users and impacted [business functions].

ROOT CAUSE ANALYSIS
The root cause was determined to be [detailed but accessible explanation].

Contributing factors:
- [Factor 1]
- [Factor 2]
- [Factor 3 if applicable]

WHAT WENT WELL
- [Positive aspect of response 1]
- [Positive aspect of response 2]
- [Positive aspect of response 3]

AREAS FOR IMPROVEMENT
- [Improvement area 1]
- [Improvement area 2]
- [Improvement area 3]

CORRECTIVE ACTIONS
| # | Action | Owner | Target Date | Status |
|---|--------|-------|-------------|--------|
| 1 | [Action description] | [Name] | [Date] | [Not Started/In Progress] |
| 2 | [Action description] | [Name] | [Date] | [Status] |
| 3 | [Action description] | [Name] | [Date] | [Status] |

METRICS
- Time to Detect: [duration from issue start to first alert]
- Time to Declare: [duration from detection to MI declaration]
- Time to Resolve: [duration from declaration to restoration]
- Total Elapsed: [end-to-end duration]
- Communications Sent: [count]
- Teams Engaged: [count]

QUESTIONS?
For questions about this review, please contact [change manager/incident manager].

---
Reference: [INC Number] | Problem: [PRB Number]
```

### Step 9: Document Communications Sent

Record all communications in the incident work notes for audit trail.

**MCP Approach:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [INC_SYS_ID]
  work_notes: |
    === COMMUNICATION LOG ===
    Type: [Initial Notification / Status Update #X / Resolution / PIR Summary]
    Sent: [date/time]
    Recipients: [list or groups]
    Channel: Email
    Subject: [email subject line]
    Status: Sent successfully
```

### Step 10: Generate Executive-Specific Communication

Create a condensed version for executive stakeholders.

```
=== EXECUTIVE BRIEF ===

Subject: [MAJOR INCIDENT] [INC Number] - Executive Brief

---

[Service Name] - [OUTAGE/DEGRADATION]
Declared: [time] | Duration: [elapsed]

IMPACT: [1 sentence impact description]
STATUS: [1 sentence current status]
ETR: [estimate or "Under assessment"]
ACTIONS: [1-2 key actions being taken]

Incident Commander: [Name] ([contact])
Next Update: [time]

---
[INC Number]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Read-Record | Get incident details | Starting point for any communication |
| SN-Query-Table | Retrieve CIs, timeline, groups | Gathering scope and context |
| SN-Update-Record | Update incident with communication status | Tracking communications |
| SN-Add-Work-Notes | Log sent communications | Audit trail |
| SN-Add-Comment | Post customer-visible updates | User-facing communications |

## Best Practices

1. **Send the initial notification within 15 minutes** of major incident declaration
2. **Use clear, jargon-free language** for non-technical audiences
3. **Always include the incident number** in the subject line for trackability
4. **Set expectations for next update** -- never leave stakeholders wondering when they will hear again
5. **Be honest about unknowns** -- "under investigation" is better than speculation
6. **Separate internal and external communications** -- internal can be more technical
7. **Include workarounds** whenever available to help users self-serve
8. **Use consistent templates** -- stakeholders should recognize the format immediately
9. **Document every communication** in incident work notes for the PIR
10. **Proofread before sending** -- rushed communications with errors undermine confidence

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Recipient list unavailable | Distribution groups not maintained | Maintain a pre-defined major incident communication list |
| Impact scope unclear | CI relationships not mapped in CMDB | Estimate based on business service; note uncertainty in communication |
| Timeline gaps | Work notes not consistently maintained | Reconstruct from system audit trail and bridge call notes |
| Conflicting updates sent | Multiple people drafting communications | Designate single communications lead; all drafts through IC |
| Stakeholders missed | Ad-hoc notification process | Use predefined notification groups and checklists |
| Email not received | Email service affected by the incident | Use alternative channels (Teams, SMS, phone tree) |

## Examples

### Example 1: Cloud Service Outage

**Initial Email:**
```
Subject: [MAJOR INCIDENT] INC0098765 - Cloud Platform Service Outage

IMPACT: Cloud Platform services are currently unavailable, affecting
all cloud-hosted applications including CRM, HRIS, and Document Management.
Approximately 3,000 users across all regions are impacted.

STATUS: Investigating - Cloud infrastructure team engaged.
Initial analysis points to a networking component failure in the
primary data center.

WORKAROUND: Users can access CRM via the mobile app (limited functionality).

NEXT UPDATE: By 10:30 AM EST or sooner.
```

### Example 2: Payment Processing Failure

**Status Update:**
```
Subject: [UPDATE #3] INC0098801 - Payment Processing - Fix in Progress

Root cause identified: Database connection pool exhaustion due to
a configuration change deployed at 2:00 AM.

PROGRESS: Database team is rolling back the configuration change.
Estimated 30 minutes to complete rollback and restart services.

IMPACT UPDATE: All payment processing remains offline.
Orders are being queued and will be processed once service is restored.
No data loss has occurred.

ETR: 11:45 AM EST

NEXT UPDATE: 11:30 AM EST
```

### Example 3: Resolution After Network Outage

**Resolution Email:**
```
Subject: [RESOLVED] INC0098812 - Corporate Network Restored

Corporate network services have been fully restored as of 3:45 PM EST.

ROOT CAUSE: A firmware bug in the core router caused a routing table
corruption during a scheduled update.

RESOLUTION: Firmware rolled back to previous stable version.
Vendor engaged for permanent fix.

DURATION: 2 hours 15 minutes (1:30 PM - 3:45 PM EST)
USERS AFFECTED: ~5,000 across headquarters and satellite offices

USER ACTION: If you experience continued connectivity issues,
please restart your VPN client. Contact Service Desk at x5555
if problems persist.

PIR scheduled for March 25, 2026.
```

## Related Skills

- `itsm/major-incident` - Full major incident management process
- `itsm/incident-lifecycle` - Standard incident management
- `development/notifications` - Automated notification configuration
- `admin/workflow-creation` - Automated communication workflows
