---
name: post-incident-analysis
version: 1.0.0
description: Conduct post-incident review for closed security incidents including timeline reconstruction, detection/response gap analysis, and lessons-learned documentation
author: Happy Technologies LLC
tags: [secops, post-incident, review, lessons-learned, timeline, gap-analysis, PIR]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Add-Work-Notes
    - SN-Update-Record
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sn_si_task
    - /api/now/table/sn_si_incident_task
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/sn_vul_entry
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_audit
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# Post-Incident Analysis

## Overview

This skill provides a structured methodology for conducting post-incident reviews (PIRs) of closed security incidents in ServiceNow Security Operations. It reconstructs the incident timeline, identifies gaps in detection and response processes, and generates comprehensive lessons-learned documentation.

Key capabilities:
- Reconstruct a complete chronological timeline from incident creation through resolution
- Calculate key response metrics (time to detect, contain, eradicate, recover)
- Identify detection gaps where indicators were missed or delayed
- Analyze response effectiveness and process adherence
- Document root cause findings and contributing factors
- Generate actionable improvement recommendations
- Create structured lessons-learned records

**When to use:** After a security incident has been resolved and closed, typically within 5-10 business days of closure for major incidents or as part of periodic review cycles for lower-severity events.

## Prerequisites

- **Roles:** `sn_si.analyst`, `sn_si.manager`, `sn_si.admin`
- **Access:** Read access to `sn_si_incident`, `sn_si_task`, `sn_ti_observable`, `sn_vul_vulnerable_item`, `sys_journal_field`, `sys_audit` tables
- **Plugins:** Security Incident Response (sn_si), Threat Intelligence (sn_ti), Vulnerability Response (sn_vul)
- **Data:** A closed security incident with populated work notes, tasks, and observables

## Procedure

### Step 1: Retrieve the Closed Incident Record

Fetch the full incident record including resolution details and timing fields.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  fields: sys_id,number,short_description,description,category,subcategory,priority,state,assigned_to,assignment_group,cmdb_ci,opened_at,resolved_at,closed_at,close_notes,close_code,business_criticality,risk_score,attack_vector,kill_chain_phase,affected_user,caller_id,contact_type
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=number=[INCIDENT_NUMBER]&sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,state,assigned_to,assignment_group,cmdb_ci,opened_at,resolved_at,closed_at,close_notes,close_code,business_criticality,risk_score,attack_vector,kill_chain_phase,affected_user,contact_type&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Build the Incident Timeline from Work Notes

Retrieve all work notes and comments in chronological order to reconstruct the event timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=sn_si_incident^element_id=[INCIDENT_SYS_ID]^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: element,value,sys_created_on,sys_created_by
  limit: 500
```

**Using REST:**
```
GET /api/now/table/sys_journal_field?sysparm_query=name=sn_si_incident^element_id=[INCIDENT_SYS_ID]^elementINwork_notes,comments^ORDERBYsys_created_on&sysparm_fields=element,value,sys_created_on,sys_created_by&sysparm_limit=500
```

### Step 3: Retrieve All Associated Tasks and Their Outcomes

Pull security incident tasks to understand the response workflow and task completion times.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_task
  query: security_incident=[INCIDENT_SYS_ID]^ORDERBYopened_at
  fields: sys_id,number,short_description,state,priority,assigned_to,assignment_group,opened_at,closed_at,close_notes,work_duration
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_si_task?sysparm_query=security_incident=[INCIDENT_SYS_ID]^ORDERBYopened_at&sysparm_fields=sys_id,number,short_description,state,priority,assigned_to,assignment_group,opened_at,closed_at,close_notes,work_duration&sysparm_limit=50&sysparm_display_value=true
```

### Step 4: Analyze Field Change History via Audit Log

Track how the incident evolved by reviewing field changes (priority, state, assignment).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sn_si_incident^documentkey=[INCIDENT_SYS_ID]^fieldnameINpriority,state,assigned_to,assignment_group,category^ORDERBYsys_created_on
  fields: fieldname,oldvalue,newvalue,sys_created_on,user
  limit: 200
```

**Using REST:**
```
GET /api/now/table/sys_audit?sysparm_query=tablename=sn_si_incident^documentkey=[INCIDENT_SYS_ID]^fieldnameINpriority,state,assigned_to,assignment_group,category^ORDERBYsys_created_on&sysparm_fields=fieldname,oldvalue,newvalue,sys_created_on,user&sysparm_limit=200
```

### Step 5: Review Threat Observables and Intelligence

Examine which IOCs were identified and when, to assess detection timeliness.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ti_observable
  query: security_incident=[INCIDENT_SYS_ID]^ORDERBYfirst_seen
  fields: sys_id,type,value,source,confidence,first_seen,last_seen,threat_score,sys_created_on
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_ti_observable?sysparm_query=security_incident=[INCIDENT_SYS_ID]^ORDERBYfirst_seen&sysparm_fields=sys_id,type,value,source,confidence,first_seen,last_seen,threat_score,sys_created_on&sysparm_limit=100
```

### Step 6: Correlate with Vulnerability Data

Check whether the attack exploited known vulnerabilities and whether patches were available.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_vulnerable_item
  query: cmdb_ci=[AFFECTED_CI_SYS_ID]
  fields: sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found,last_found
  limit: 50
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_entry
  query: sys_idIN[VULNERABILITY_SYS_IDS]
  fields: sys_id,cve_id,description,cvss_score,severity,exploit_available,vendor_advisory,published_date
  limit: 20
```

**Using REST:**
```
GET /api/now/table/sn_vul_vulnerable_item?sysparm_query=cmdb_ci=[AFFECTED_CI_SYS_ID]&sysparm_fields=sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found,last_found&sysparm_limit=50&sysparm_display_value=true

GET /api/now/table/sn_vul_entry?sysparm_query=sys_idIN[VULNERABILITY_SYS_IDS]&sysparm_fields=sys_id,cve_id,description,cvss_score,severity,exploit_available,vendor_advisory,published_date&sysparm_limit=20
```

### Step 7: Calculate Response Metrics

Compute key performance indicators from the incident timeline.

**Metrics to calculate:**
- **Time to Detect (TTD):** Time between first observable `first_seen` and incident `opened_at`
- **Time to Triage (TTT):** Time between `opened_at` and first state change from "New"
- **Time to Contain (TTC):** Time between `opened_at` and containment task completion
- **Time to Eradicate (TTE):** Time between containment and eradication task completion
- **Time to Resolve (TTR):** Time between `opened_at` and `resolved_at`
- **Reassignment Count:** Number of assignment_group changes in audit log
- **Escalation Count:** Number of priority upgrades in audit log

### Step 8: Document the Post-Incident Analysis

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  work_notes: |
    === POST-INCIDENT ANALYSIS REPORT ===
    Incident: SIR0008901 | Analyst: J. Smith | Review Date: 2026-03-19

    EXECUTIVE SUMMARY:
    Ransomware incident affecting file server FILESVR-03. Initial access
    via phishing email delivered to user in Finance department. Malware
    propagated to shared drives before containment. No data exfiltration
    confirmed. Full recovery from backups completed.

    TIMELINE RECONSTRUCTION:
    2026-03-10 08:15 - Phishing email received by user (first observable)
    2026-03-10 08:22 - User clicked malicious link and downloaded payload
    2026-03-10 08:45 - Malware executed, began encrypting local files
    2026-03-10 09:30 - Encryption spread to mapped network drives
    2026-03-10 10:15 - Help desk ticket opened by affected user
    2026-03-10 10:30 - Security incident created (SIR0008901)
    2026-03-10 10:45 - Triage complete, escalated to P1
    2026-03-10 11:00 - Server isolated from network (containment)
    2026-03-10 14:00 - Malware sample identified, IOCs extracted
    2026-03-11 09:00 - Full forensic analysis complete
    2026-03-12 16:00 - Server rebuilt and restored from backup
    2026-03-13 10:00 - Incident resolved and closed

    RESPONSE METRICS:
    Time to Detect: 2h 15m (email received → incident created)
    Time to Triage: 15m
    Time to Contain: 30m (from triage)
    Time to Eradicate: 1d 3h
    Time to Resolve: 3d 1h 30m
    Reassignments: 1
    Escalations: 1 (P3 → P1)

    DETECTION GAP ANALYSIS:
    - Email gateway did not flag the phishing email (new domain, no reputation data)
    - EDR agent on workstation was running outdated signatures (3 days old)
    - Network-based detection triggered 45 minutes after execution
    - No UEBA alert for anomalous file access patterns

    ROOT CAUSE:
    Primary: Spear-phishing email bypassed email security controls
    Contributing: EDR signature update delay, user security awareness gap

    WHAT WENT WELL:
    - Rapid containment once incident was identified (30 minutes)
    - Clean backups available for full restoration
    - Clear communication to management throughout

    IMPROVEMENT RECOMMENDATIONS:
    1. Implement URL sandboxing on email gateway (Priority: High)
    2. Reduce EDR signature update interval to 4 hours (Priority: High)
    3. Deploy UEBA for anomalous file access detection (Priority: Medium)
    4. Conduct targeted phishing awareness training for Finance (Priority: Medium)
    5. Add network segmentation between user workstations and file servers (Priority: Low)

    LESSONS LEARNED:
    - Phishing remains the primary initial access vector; defense-in-depth required
    - Backup strategy proved critical for recovery; validate backup integrity quarterly
    - Containment playbook was effective; formalize for similar future incidents
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Query-Table | Retrieve incident history, tasks, observables, audit entries, and vulnerabilities |
| SN-Read-Record | Get complete details on the incident under review |
| SN-Add-Work-Notes | Document the PIR findings on the incident record |
| SN-Update-Record | Update incident fields such as close_code or add PIR reference |
| SN-Execute-Background-Script | Run scripts to calculate complex metrics across related records |

## Best Practices

- **Conduct PIRs promptly** while details are fresh; within 5 business days for critical incidents
- **Maintain a blameless culture** by focusing on process and tooling gaps, not individual failures
- **Use quantitative metrics** (TTD, TTC, TTR) alongside qualitative analysis for balanced assessment
- **Map to MITRE ATT&CK** framework to systematically identify detection and prevention gaps per technique
- **Track improvement actions** as formal tasks or change requests to ensure follow-through
- **Compare against baselines** using historical metrics to contextualize the incident response performance
- **Involve all stakeholders** including IT operations, network team, and management for comprehensive review
- **Archive PIR reports** as knowledge articles for future reference and training

## Troubleshooting

### Incomplete Timeline Due to Missing Work Notes
**Cause:** Analysts may not have documented all actions in work notes during a high-pressure incident.
**Solution:** Supplement with audit log data (`sys_audit`), syslog entries, and task completion timestamps to fill timeline gaps. Interview responding analysts if needed.

### Cannot Calculate Accurate Detection Time
**Cause:** The `first_seen` timestamp on observables may reflect when they were ingested, not when the attack actually began.
**Solution:** Cross-reference with external SIEM or EDR timestamps. Use syslog entries to identify the earliest evidence of compromise.

### Vulnerability Data Not Linked to Incident CI
**Cause:** The `cmdb_ci` field on the incident may not match the CI in vulnerability records due to naming discrepancies.
**Solution:** Search `sn_vul_vulnerable_item` by CI name using `LIKE` operator, or query by IP address or hostname.

### Audit Log Has Gaps
**Cause:** Audit retention policies may have purged entries for older incidents.
**Solution:** Check the `sys_audit_delete` table for archived records. For future PIRs, ensure audit retention covers at least 90 days.

## Examples

**Example 1: Phishing Incident PIR**
1. Retrieve closed incident SIR0008901 and all associated fields
2. Pull 45 work note entries spanning the 3-day incident lifecycle
3. Identify 12 tasks including containment, forensics, recovery, and communications
4. Find 8 observables (3 IPs, 2 domains, 2 file hashes, 1 email address)
5. Calculate TTD of 2h 15m vs. organizational target of 1h
6. Document 5 improvement recommendations with assigned owners
7. Create follow-up change request for email gateway URL sandboxing

**Example 2: Data Breach PIR with Regulatory Implications**
1. Retrieve incident SIR0007500 involving confirmed PII exposure
2. Reconstruct 7-day timeline from initial compromise to discovery
3. Identify 72-hour detection gap where attacker had undetected access
4. Correlate with 3 unpatched critical vulnerabilities on the affected server
5. Document regulatory notification timeline and compliance status
6. Generate executive summary for legal and compliance teams
7. Create 8 improvement actions including mandatory patching SLA enforcement

## Related Skills

- `secops/correlation-insights` - Correlate related incidents discovered during PIR
- `secops/incident-summarization` - Generate executive summaries from PIR findings
- `secops/metrics-analysis` - Track PIR metrics trends over time
- `secops/shift-handover` - Reference PIR findings in shift briefings
- `security/incident-response` - Incident response procedures reviewed during PIR
