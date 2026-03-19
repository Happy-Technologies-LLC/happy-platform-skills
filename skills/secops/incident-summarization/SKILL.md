---
name: incident-summarization
version: 1.0.0
description: Generate executive and technical summaries for security incidents including threat classification, affected assets, containment status, and recommended actions
author: Happy Technologies LLC
tags: [secops, incident, summarization, executive-summary, threat-classification, reporting]
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
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/cmdb_ci
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Security Incident Summarization

## Overview

This skill enables SOC analysts and security managers to generate structured summaries of security incidents at multiple levels of detail. It produces both executive summaries for leadership and technical summaries for operational teams, ensuring consistent communication about incident status, impact, and response actions.

Key capabilities:
- Generate concise executive summaries suitable for CISO and management briefings
- Produce detailed technical summaries with IOCs, attack vectors, and forensic findings
- Classify threats using standardized categories and MITRE ATT&CK mapping
- Inventory affected assets with business criticality context
- Summarize containment status and response progress
- Compile recommended actions prioritized by urgency

**When to use:** When a security incident requires communication to stakeholders at any level, including management updates, cross-team coordination, regulatory notifications, or documentation for compliance.

## Prerequisites

- **Roles:** `sn_si.analyst`, `sn_si.manager`
- **Access:** Read access to `sn_si_incident`, `sn_si_task`, `sn_ti_observable`, `sn_vul_vulnerable_item`, `cmdb_ci`, `sys_journal_field` tables
- **Plugins:** Security Incident Response (sn_si), Threat Intelligence (sn_ti), Vulnerability Response (sn_vul)
- **Data:** An active or recently closed security incident with populated fields

## Procedure

### Step 1: Retrieve Core Incident Details

Fetch the complete incident record with all classification and timing fields.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  fields: sys_id,number,short_description,description,category,subcategory,priority,state,assigned_to,assignment_group,cmdb_ci,opened_at,resolved_at,closed_at,close_notes,close_code,business_criticality,risk_score,attack_vector,kill_chain_phase,severity,contact_type,affected_user,caller_id
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=number=[INCIDENT_NUMBER]&sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,state,assigned_to,assignment_group,cmdb_ci,opened_at,resolved_at,closed_at,close_notes,close_code,business_criticality,risk_score,attack_vector,kill_chain_phase,severity,contact_type,affected_user&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Gather Affected Asset Details

Retrieve configuration item details for all affected assets to assess business impact.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_id=[CMDB_CI_SYS_ID]
  fields: sys_id,name,sys_class_name,ip_address,os,environment,business_criticality,support_group,department,location,operational_status
  limit: 1
```

For incidents affecting multiple assets, query by related records:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_idIN[CI_SYS_ID_1,CI_SYS_ID_2,CI_SYS_ID_3]
  fields: sys_id,name,sys_class_name,ip_address,os,environment,business_criticality,support_group,department,location,operational_status
  limit: 20
```

**Using REST:**
```
GET /api/now/table/cmdb_ci?sysparm_query=sys_id=[CMDB_CI_SYS_ID]&sysparm_fields=sys_id,name,sys_class_name,ip_address,os,environment,business_criticality,support_group,department,location,operational_status&sysparm_limit=1&sysparm_display_value=true
```

### Step 3: Retrieve Threat Observables and IOCs

Collect all indicators of compromise associated with the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ti_observable
  query: security_incident=[INCIDENT_SYS_ID]
  fields: sys_id,type,value,source,confidence,first_seen,last_seen,threat_score
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_ti_observable?sysparm_query=security_incident=[INCIDENT_SYS_ID]&sysparm_fields=sys_id,type,value,source,confidence,first_seen,last_seen,threat_score&sysparm_limit=100
```

### Step 4: Check Containment and Response Task Status

Pull all security incident tasks to assess response progress.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_task
  query: security_incident=[INCIDENT_SYS_ID]^ORDERBYopened_at
  fields: sys_id,number,short_description,state,priority,assigned_to,assignment_group,opened_at,closed_at,task_type
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_si_task?sysparm_query=security_incident=[INCIDENT_SYS_ID]^ORDERBYopened_at&sysparm_fields=sys_id,number,short_description,state,priority,assigned_to,assignment_group,opened_at,closed_at,task_type&sysparm_limit=50&sysparm_display_value=true
```

### Step 5: Check Related Vulnerabilities

Identify vulnerabilities on affected assets that may be relevant to the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_vulnerable_item
  query: cmdb_ci=[AFFECTED_CI_SYS_ID]^stateINOpen,Under Investigation
  fields: sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found
  limit: 20
```

**Using REST:**
```
GET /api/now/table/sn_vul_vulnerable_item?sysparm_query=cmdb_ci=[AFFECTED_CI_SYS_ID]^stateINOpen,Under Investigation&sysparm_fields=sys_id,vulnerability,cmdb_ci,state,risk_score,cvss_score,first_found&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Retrieve Recent Work Notes for Context

Pull the latest analyst notes to capture current findings and actions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=sn_si_incident^element_id=[INCIDENT_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

**Using REST:**
```
GET /api/now/table/sys_journal_field?sysparm_query=name=sn_si_incident^element_id=[INCIDENT_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=20
```

### Step 7: Generate the Executive Summary

Compile a high-level summary suitable for CISO and senior leadership.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  work_notes: |
    === EXECUTIVE SUMMARY ===
    Incident: SIR0009100 | Generated: 2026-03-19 14:00 UTC

    CLASSIFICATION:
    Type: Ransomware | Severity: Critical | Priority: P1
    Attack Vector: Phishing email with malicious attachment
    Kill Chain Phase: Actions on Objectives
    MITRE ATT&CK: T1566.001 (Spearphishing Attachment), T1486 (Data Encrypted for Impact)

    BUSINESS IMPACT:
    Affected System: FILESVR-03 (Production File Server)
    Business Criticality: High | Department: Finance
    Impact: File sharing services unavailable for 45 users
    Data at Risk: Financial reports, accounts payable records
    Revenue Impact: Estimated $50K/day in operational delays

    CURRENT STATUS:
    State: Containment | Progress: 60%
    - Server isolated from network (COMPLETE)
    - Forensic image captured (COMPLETE)
    - Malware analysis in progress (IN PROGRESS)
    - Backup restoration planned for tomorrow (PENDING)

    KEY DECISIONS NEEDED:
    1. Approve emergency change for server rebuild (requires CAB approval)
    2. Determine if regulatory notification is required (legal review pending)
    3. Authorize overtime for weekend recovery operations

    NEXT UPDATE: 2026-03-19 18:00 UTC
```

### Step 8: Generate the Technical Summary

Compile a detailed technical summary for the response team.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  work_notes: |
    === TECHNICAL SUMMARY ===
    Incident: SIR0009100 | Generated: 2026-03-19 14:00 UTC

    THREAT DETAILS:
    Malware Family: LockBit 3.0 variant
    Initial Access: Phishing email to user J.Doe (Finance)
    Delivery: .zip attachment containing .iso with embedded .lnk
    Execution: PowerShell download cradle → Cobalt Strike beacon
    Lateral Movement: PsExec to FILESVR-03 using harvested credentials
    Impact: AES-256 encryption of SMB shares (~2TB data)

    INDICATORS OF COMPROMISE:
    IP Addresses:
    - 198.51.100.45 (C2 server, confidence: 95%)
    - 203.0.113.78 (payload delivery, confidence: 90%)
    Domains:
    - update-service[.]example.com (C2, confidence: 95%)
    File Hashes (SHA256):
    - a1b2c3d4...ef56 (initial dropper)
    - f6e5d4c3...b2a1 (ransomware payload)
    Email:
    - invoice-2026@spoofed-domain.com (sender)

    AFFECTED ASSETS:
    | Asset | Type | IP | Status | Criticality |
    |-------|------|----|--------|-------------|
    | FILESVR-03 | Windows Server | 10.1.5.20 | Isolated | High |
    | WS-FIN-042 | Workstation | 10.2.3.42 | Reimaged | Medium |

    VULNERABILITIES EXPLOITED:
    - CVE-2025-21345 (CVSS 8.8) - Windows SMB elevation of privilege
    - Outdated EDR signatures (not a CVE but contributing factor)

    RESPONSE TASKS:
    | Task | Status | Owner | ETA |
    |------|--------|-------|-----|
    | Network isolation | Complete | NetOps | Done |
    | Forensic imaging | Complete | DFIR Team | Done |
    | Malware reverse engineering | In Progress | Threat Intel | Mar 20 |
    | IOC blocklist deployment | Complete | SOC | Done |
    | Backup validation | In Progress | IT Ops | Mar 19 |
    | Server rebuild | Pending | IT Ops | Mar 20 |
    | User credential reset | Complete | IAM Team | Done |
    | Phishing awareness alert | Pending | Comms | Mar 19 |

    CONTAINMENT VERIFICATION:
    - Firewall rules blocking C2 IPs: CONFIRMED
    - DNS sinkhole for C2 domain: CONFIRMED
    - Affected user credentials reset: CONFIRMED
    - Network scan for lateral movement indicators: IN PROGRESS
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Read-Record | Retrieve full incident details by sys_id |
| SN-Query-Table | Query tasks, observables, vulnerabilities, CIs, and work notes |
| SN-Add-Work-Notes | Post executive and technical summaries to the incident |
| SN-NL-Search | Natural language queries for quick incident lookup |

## Best Practices

- **Tailor the summary to the audience** with executive summaries focused on business impact and decisions, technical summaries focused on IOCs and response actions
- **Use consistent formatting** so recipients can quickly find the information they need across incidents
- **Include timestamps** on all summaries so readers know how current the information is
- **Highlight decisions needed** in executive summaries to drive action from leadership
- **List IOCs in a machine-parseable format** in technical summaries for easy ingestion into blocking tools
- **Reference MITRE ATT&CK** techniques to standardize threat classification across the organization
- **Update summaries regularly** during active incidents; stale summaries erode stakeholder confidence
- **Separate facts from assessments** clearly labeling confirmed findings vs. analyst judgment

## Troubleshooting

### CI Details Not Available
**Cause:** The `cmdb_ci` field on the incident may reference a CI that has been decommissioned or is in a different CMDB class.
**Solution:** Search `cmdb_ci_list` by name or IP address. Check the `cmdb_ci_server`, `cmdb_ci_computer`, or other subclass tables.

### No Observables Linked to Incident
**Cause:** Threat intelligence may not have been ingested or linked to the specific incident.
**Solution:** Check the `sn_ti_observable` table broadly for relevant IOCs by value. Manually link observables to the incident if found.

### Task Types Not Matching Expected Workflow
**Cause:** Different playbook configurations may use different task types or naming conventions.
**Solution:** Query `sn_si_task` without task_type filter to see all tasks. Review the playbook configuration for the incident category.

## Examples

**Example 1: P1 Incident Executive Briefing**
1. Retrieve incident SIR0009100 with full classification details
2. Query CMDB for affected server details and business criticality
3. Pull 6 observables including 2 IPs, 2 hashes, 1 domain, 1 email
4. Identify 8 response tasks, 5 complete and 3 in progress
5. Generate executive summary highlighting $50K/day business impact
6. Post summary to incident and email to CISO distribution list

**Example 2: Multi-Asset Incident Technical Summary**
1. Retrieve incident SIR0008750 affecting 15 workstations and 2 servers
2. Query CMDB for all 17 affected CIs with IP addresses and OS versions
3. Collect 23 IOCs across IP, domain, hash, and registry key types
4. Map attack to 7 MITRE ATT&CK techniques across 4 tactics
5. Document containment status per asset in tabular format
6. Generate both executive and technical summaries in a single update

## Related Skills

- `secops/correlation-insights` - Identify related incidents to include in summary
- `secops/shift-handover` - Use summaries as input to shift handover reports
- `secops/post-incident-analysis` - Detailed analysis after incident resolution
- `secops/metrics-analysis` - Track summarization timeliness as an operational metric
- `security/incident-response` - Full incident response procedures
