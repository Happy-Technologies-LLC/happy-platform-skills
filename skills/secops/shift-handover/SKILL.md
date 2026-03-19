---
name: shift-handover
version: 1.0.0
description: Generate comprehensive shift handover content for SOC analysts including active incidents, pending tasks, escalations, and critical items needing attention
author: Happy Technologies LLC
tags: [secops, soc, shift-handover, operations, analyst, continuity]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Add-Work-Notes
    - SN-NL-Search
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sn_si_task
    - /api/now/table/sn_si_incident_task
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# SOC Shift Handover

## Overview

This skill enables SOC analysts to generate comprehensive shift handover reports that ensure continuity between analyst rotations. By aggregating active incidents, pending tasks, recent escalations, and critical observations, the incoming team receives a complete picture of the current security posture.

Key capabilities:
- Summarize all active security incidents by priority and state
- Identify pending tasks and their owners from the outgoing shift
- Highlight recent escalations and priority changes
- Surface stalled or aging incidents requiring follow-up
- Compile critical observables and threat intelligence updates
- Generate a structured handover document for the incoming shift

**When to use:** At the end of each SOC analyst shift, or when transferring responsibility for active security operations to another team or analyst.

## Prerequisites

- **Roles:** `sn_si.analyst`, `sn_si.manager`
- **Access:** Read access to `sn_si_incident`, `sn_si_task`, `sn_si_incident_task`, `sn_ti_observable`, `sys_journal_field` tables
- **Plugins:** Security Incident Response (sn_si), Threat Intelligence (sn_ti)
- **Data:** Active security incidents with populated assignment groups and work notes

## Procedure

### Step 1: Retrieve All Active Security Incidents

Pull all open security incidents sorted by priority to establish the current workload.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: active=true^ORDERBYpriority
  fields: sys_id,number,short_description,priority,state,category,subcategory,assigned_to,assignment_group,cmdb_ci,opened_at,business_criticality,risk_score
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=active=true^ORDERBYpriority&sysparm_fields=sys_id,number,short_description,priority,state,category,subcategory,assigned_to,assignment_group,cmdb_ci,opened_at,business_criticality,risk_score&sysparm_limit=100&sysparm_display_value=true
```

### Step 2: Identify Incidents Opened or Updated During the Current Shift

Filter incidents that were created or modified during the outgoing shift window (e.g., last 8 hours).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: sys_updated_onONLast 8 hours@javascript:gs.hoursAgoStart(8)@javascript:gs.hoursAgoEnd(0)^active=true
  fields: sys_id,number,short_description,priority,state,category,assigned_to,sys_updated_on,opened_at
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=sys_updated_onONLast 8 hours@javascript:gs.hoursAgoStart(8)@javascript:gs.hoursAgoEnd(0)^active=true&sysparm_fields=sys_id,number,short_description,priority,state,category,assigned_to,sys_updated_on,opened_at&sysparm_limit=50&sysparm_display_value=true
```

### Step 3: Retrieve Pending Security Tasks

Pull all open tasks associated with active security incidents.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_task
  query: active=true^ORDERBYpriority
  fields: sys_id,number,short_description,state,priority,assigned_to,assignment_group,security_incident,due_date,sys_updated_on
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_si_task?sysparm_query=active=true^ORDERBYpriority&sysparm_fields=sys_id,number,short_description,state,priority,assigned_to,assignment_group,security_incident,due_date,sys_updated_on&sysparm_limit=100&sysparm_display_value=true
```

### Step 4: Check for Recent Escalations and Priority Changes

Query the audit log for priority changes and escalations during the shift.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sn_si_incident^fieldname=priority^sys_created_onONLast 8 hours@javascript:gs.hoursAgoStart(8)@javascript:gs.hoursAgoEnd(0)
  fields: documentkey,fieldname,oldvalue,newvalue,sys_created_on,user
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sys_audit?sysparm_query=tablename=sn_si_incident^fieldname=priority^sys_created_onONLast 8 hours@javascript:gs.hoursAgoStart(8)@javascript:gs.hoursAgoEnd(0)&sysparm_fields=documentkey,fieldname,oldvalue,newvalue,sys_created_on,user&sysparm_limit=50
```

### Step 5: Identify Stalled or Aging Incidents

Find incidents that have not been updated recently and may need follow-up.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: active=true^sys_updated_on<javascript:gs.hoursAgo(24)^stateNOT IN6,7
  fields: sys_id,number,short_description,priority,state,assigned_to,sys_updated_on,opened_at
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=active=true^sys_updated_on<javascript:gs.hoursAgo(24)^stateNOT IN6,7&sysparm_fields=sys_id,number,short_description,priority,state,assigned_to,sys_updated_on,opened_at&sysparm_limit=50&sysparm_display_value=true
```

### Step 6: Gather Recent Work Notes on Critical Incidents

Pull the latest work notes for high-priority incidents to capture analyst context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=sn_si_incident^element=work_notes^element_id=[CRITICAL_INCIDENT_SYS_ID]^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 10
```

**Using REST:**
```
GET /api/now/table/sys_journal_field?sysparm_query=name=sn_si_incident^element=work_notes^element_id=[CRITICAL_INCIDENT_SYS_ID]^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=10
```

### Step 7: Check Active Vulnerability Exploitations

Identify any vulnerabilities currently under active exploitation that may require monitoring.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_vulnerable_item
  query: stateINOpen,Under Investigation^risk_score>=80
  fields: sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found,last_found
  limit: 20
```

**Using REST:**
```
GET /api/now/table/sn_vul_vulnerable_item?sysparm_query=stateINOpen,Under Investigation^risk_score>=80&sysparm_fields=sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found,last_found&sysparm_limit=20&sysparm_display_value=true
```

### Step 8: Compile and Document the Shift Handover Report

Assemble all collected information into a structured handover document.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [PRIMARY_INCIDENT_SYS_ID]
  work_notes: |
    === SOC SHIFT HANDOVER REPORT ===
    Shift: Day Shift (06:00 - 14:00) | Date: 2026-03-19
    Outgoing Analyst: J. Smith | Incoming Analyst: A. Johnson

    ACTIVE INCIDENTS SUMMARY:
    Total Active: 12 | Critical/P1: 2 | High/P2: 4 | Medium/P3: 5 | Low/P4: 1

    CRITICAL INCIDENTS REQUIRING IMMEDIATE ATTENTION:
    1. SIR0008901 (P1) - Active ransomware on FILESVR-03
       Status: Containment in progress
       Last Action: Isolated server from network, forensic image initiated
       Next Steps: Complete forensic capture, begin malware analysis
       Assigned: T. Williams

    2. SIR0008923 (P1) - Data exfiltration detected on DB-PROD-01
       Status: Investigation
       Last Action: Identified C2 communication to 198.51.100.45
       Next Steps: Block C2 at firewall, assess data loss scope
       Assigned: K. Chen

    NEW INCIDENTS THIS SHIFT:
    - SIR0008950 (P3) - Phishing email reported by HR dept
    - SIR0008951 (P2) - Unauthorized admin account created on AD
    - SIR0008952 (P3) - Suspicious outbound DNS queries from WS-0456

    ESCALATIONS DURING SHIFT:
    - SIR0008923: Escalated P2 → P1 at 10:30 due to confirmed exfiltration

    STALLED INCIDENTS (no update >24h):
    - SIR0008890 (P3) - Awaiting endpoint scan results from IT
    - SIR0008875 (P3) - Pending vendor response on false positive

    PENDING TASKS:
    - SITASK0012345: Collect memory dump from WS-0234 (Due: today)
    - SITASK0012350: Review firewall logs for SIR0008923 (Due: today)
    - SITASK0012355: Update IOC blocklist (Due: tomorrow)

    HIGH-RISK VULNERABILITIES UNDER WATCH:
    - CVE-2025-44123 (CVSS 9.8) on WEBSVR-01 - Exploit available, patch pending
    - CVE-2025-33456 (CVSS 8.5) on DB-PROD-02 - Under investigation

    NOTES FOR INCOMING TEAM:
    - Management briefing scheduled for 15:00 on SIR0008923
    - New Palo Alto IOC feed integration went live at 12:00 - monitor for issues
    - Analyst M. Davis is OOO tomorrow - redistribute tasks
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Query-Table | Retrieve active incidents, tasks, audit entries, and vulnerabilities |
| SN-Read-Record | Get detailed information on specific high-priority incidents |
| SN-Add-Work-Notes | Document the handover report on relevant incident records |
| SN-NL-Search | Natural language queries for quick incident lookups |

## Best Practices

- **Standardize the handover format** so incoming analysts can quickly scan for critical items
- **Prioritize actionable items** at the top of the report; critical incidents and time-sensitive tasks come first
- **Include context, not just status** by summarizing recent analyst notes and next steps for each critical incident
- **Flag stalled incidents explicitly** so they do not fall through the cracks during shift transitions
- **Document environmental changes** such as new integrations, tool outages, or policy changes that occurred during the shift
- **Record personnel notes** including who is out of office, new team members, or coverage gaps
- **Keep the report concise** while ensuring no critical details are omitted; aim for scannable sections with bullet points
- **Timestamp all entries** so the incoming team knows how current the information is

## Troubleshooting

### No Incidents Found for the Shift Window
**Cause:** The time filter may not match the actual shift hours, or timezone differences may skew results.
**Solution:** Adjust the `hoursAgo` value or use explicit datetime ranges with `BETWEEN` operator. Verify the instance timezone matches your SOC timezone.

### Audit Log Returns No Priority Changes
**Cause:** The `sys_audit` table may have a retention policy that purges old records, or auditing may not be enabled for the priority field.
**Solution:** Check `sys_audit` configuration for the `sn_si_incident` table. Alternatively, query `sys_journal_field` for work notes that mention escalation.

### Work Notes Are Truncated or Missing
**Cause:** Journal fields have size limits and older entries may be archived.
**Solution:** Increase the query limit or paginate through results. Check if journal entry archiving is configured on the instance.

## Examples

**Example 1: Standard Day-to-Night Shift Handover**
1. Query all active incidents at 17:45 before shift ends at 18:00
2. Filter incidents updated during the 06:00-18:00 window
3. Pull pending tasks with due dates today or tomorrow
4. Check audit log for any escalations during the shift
5. Identify stalled incidents not updated in 24+ hours
6. Compile report and post as work notes on each critical incident
7. Verbally brief incoming analyst on the two P1 incidents

**Example 2: Emergency Mid-Shift Handover**
1. Analyst must leave unexpectedly during active P1 incident
2. Rapidly pull current state of all assigned incidents
3. Gather last 5 work notes on each active incident for context
4. Document current containment actions in progress
5. Identify tasks that need immediate pickup by another analyst
6. Post abbreviated handover notes and notify SOC manager

## Related Skills

- `secops/correlation-insights` - Correlate incidents referenced in handover
- `secops/incident-summarization` - Generate detailed summaries for handover items
- `secops/post-incident-analysis` - Review completed incidents from prior shifts
- `secops/metrics-analysis` - Track shift performance metrics over time
- `security/incident-response` - Security incident handling procedures
