---
name: correlation-insights
version: 1.0.0
description: Correlate security incidents with related events, vulnerabilities, and threat intelligence to identify attack patterns and common indicators
author: Happy Technologies LLC
tags: [secops, correlation, threat-intelligence, siem, attack-patterns, indicators]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
    - SN-Update-Record
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/sn_si_task
    - /api/now/table/sys_audit
    - /api/now/table/syslog
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Security Incident Correlation Insights

## Overview

This skill enables SOC analysts to correlate security incidents with related events, vulnerabilities, and threat intelligence across the ServiceNow Security Operations portfolio. By identifying shared indicators of compromise (IOCs), overlapping timelines, and common attack vectors, analysts can uncover broader attack campaigns and prioritize response efforts.

Key capabilities:
- Cross-reference security incidents by shared observables (IPs, domains, file hashes)
- Link vulnerabilities to active exploitation in security incidents
- Identify recurring attack patterns across time periods
- Surface related incidents that may be part of a coordinated campaign
- Enrich incident context with threat intelligence data

**When to use:** During active incident investigation, threat hunting, or periodic security portfolio reviews to identify connections between seemingly isolated events.

## Prerequisites

- **Roles:** `sn_si.analyst`, `sn_si.admin`, `sn_ti.reader`
- **Access:** Security Incident (sn_si_incident), Threat Intelligence (sn_ti_observable), Vulnerability Response (sn_vul_vulnerable_item) tables
- **Plugins:** Security Incident Response (sn_si), Threat Intelligence (sn_ti), Vulnerability Response (sn_vul)
- **Data:** Active security incidents with populated observables and related configuration items

## Procedure

### Step 1: Identify the Anchor Incident

Retrieve the primary incident and its key attributes for correlation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: number=[INCIDENT_NUMBER]
  fields: sys_id,number,short_description,category,subcategory,priority,state,assigned_to,affected_user,cmdb_ci,opened_at,resolved_at,close_notes,business_criticality
  limit: 1
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=number=[INCIDENT_NUMBER]&sysparm_fields=sys_id,number,short_description,category,subcategory,priority,state,assigned_to,affected_user,cmdb_ci,opened_at,resolved_at,close_notes,business_criticality&sysparm_limit=1
```

### Step 2: Retrieve Observables for the Anchor Incident

Pull all threat observables (IOCs) linked to the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ti_observable
  query: security_incident=[INCIDENT_SYS_ID]
  fields: sys_id,type,value,source,confidence,first_seen,last_seen,threat_score
  limit: 200
```

**Using REST:**
```
GET /api/now/table/sn_ti_observable?sysparm_query=security_incident=[INCIDENT_SYS_ID]&sysparm_fields=sys_id,type,value,source,confidence,first_seen,last_seen,threat_score&sysparm_limit=200
```

### Step 3: Find Incidents Sharing Common Observables

Search for other incidents that share the same IP addresses, domains, or file hashes.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ti_observable
  query: value=[OBSERVABLE_VALUE]^security_incident!=[ANCHOR_INCIDENT_SYS_ID]
  fields: sys_id,security_incident,type,value,confidence,first_seen
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_ti_observable?sysparm_query=value=[OBSERVABLE_VALUE]^security_incident!=[ANCHOR_INCIDENT_SYS_ID]&sysparm_fields=sys_id,security_incident,type,value,confidence,first_seen&sysparm_limit=50
```

### Step 4: Correlate with Vulnerability Data

Identify exploitable vulnerabilities on assets involved in the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_vulnerable_item
  query: cmdb_ci=[AFFECTED_CI_SYS_ID]^stateINOpen,Under Investigation
  fields: sys_id,vulnerability,cmdb_ci,state,risk_score,first_found,last_found,cvss_score
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_vul_vulnerable_item?sysparm_query=cmdb_ci=[AFFECTED_CI_SYS_ID]^stateINOpen,Under Investigation&sysparm_fields=sys_id,vulnerability,cmdb_ci,state,risk_score,first_found,last_found,cvss_score&sysparm_limit=100
```

### Step 5: Check Vulnerability Entry Details for CVE Context

Look up CVE details for identified vulnerabilities to understand the attack surface.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_entry
  query: sys_idIN[VULNERABILITY_SYS_IDS]
  fields: sys_id,cve_id,description,cvss_score,severity,exploit_available,vendor_advisory
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_vul_entry?sysparm_query=sys_idIN[VULNERABILITY_SYS_IDS]&sysparm_fields=sys_id,cve_id,description,cvss_score,severity,exploit_available,vendor_advisory&sysparm_limit=50
```

### Step 6: Search for Related Incidents by Category and Timeframe

Find incidents with similar attack categories within a relevant time window.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: category=[CATEGORY]^opened_atBETWEENjavascript:gs.dateGenerate('2026-03-01','00:00:00')@javascript:gs.dateGenerate('2026-03-19','23:59:59')^sys_id!=[ANCHOR_SYS_ID]
  fields: sys_id,number,short_description,category,subcategory,priority,state,cmdb_ci,opened_at,affected_user
  limit: 50
```

**Using REST:**
```
GET /api/now/table/sn_si_incident?sysparm_query=category=[CATEGORY]^opened_atBETWEEN2026-03-01 00:00:00@2026-03-19 23:59:59^sys_id!=[ANCHOR_SYS_ID]&sysparm_fields=sys_id,number,short_description,category,subcategory,priority,state,cmdb_ci,opened_at,affected_user&sysparm_limit=50
```

### Step 7: Analyze System Logs for Attack Indicators

Query syslog for entries related to the attack timeline and source indicators.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sys_created_onBETWEEN[START_TIME]@[END_TIME]^messageLIKE[OBSERVABLE_VALUE]
  fields: level,message,source,sys_created_on
  limit: 500
```

**Using REST:**
```
GET /api/now/table/syslog?sysparm_query=sys_created_onBETWEEN[START_TIME]@[END_TIME]^messageLIKE[OBSERVABLE_VALUE]&sysparm_fields=level,message,source,sys_created_on&sysparm_limit=500
```

### Step 8: Build Correlation Summary and Document Findings

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [ANCHOR_INCIDENT_SYS_ID]
  work_notes: |
    CORRELATION ANALYSIS - [TIMESTAMP]

    Shared Observables Found:
    - IP 203.0.113.50: Also seen in SIR0001234, SIR0001456
    - Domain malicious-c2.example.com: Seen in SIR0001234
    - File hash (SHA256) abc123...: Unique to this incident

    Related Incidents:
    - SIR0001234 (High) - Phishing campaign targeting finance dept
    - SIR0001456 (Medium) - Unauthorized outbound connection

    Vulnerability Overlap:
    - CVE-2025-12345 (CVSS 9.8) - Active on affected CI, exploit available
    - CVE-2025-67890 (CVSS 7.5) - Patched but re-introduced

    Assessment: High confidence these incidents are part of a coordinated
    campaign targeting financial systems via spear-phishing with subsequent
    lateral movement exploiting unpatched vulnerabilities.

    Recommended Actions:
    1. Escalate all correlated incidents to Tier 3
    2. Block identified IOCs at perimeter
    3. Expedite patching for CVE-2025-12345
    4. Initiate threat hunt across all finance department assets
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Query-Table | Retrieve incidents, observables, vulnerabilities, and logs |
| SN-Execute-Background-Script | Run advanced correlation scripts across large datasets |
| SN-Add-Work-Notes | Document correlation findings on incident records |
| SN-Update-Record | Update incident priority or category based on findings |

## Best Practices

- **Start with high-confidence observables** such as file hashes and specific IPs rather than broad indicators like common ports
- **Use time-window analysis** to limit correlation scope; start narrow (24 hours) and expand if needed
- **Validate observable confidence scores** before correlating; low-confidence indicators may produce false correlations
- **Document all correlation logic** so other analysts can verify and extend findings
- **Consider MITRE ATT&CK mapping** to identify the attack phase and predict next steps
- **Check for false positive patterns** such as shared infrastructure (CDNs, cloud IPs) that may create spurious correlations
- **Preserve the correlation chain** by linking related incident records using the Related Records list

## Troubleshooting

### No Observables Found on Incident
**Cause:** Observables may not have been ingested from SIEM or manually entered.
**Solution:** Check the sn_ti_observable table directly with a broader query. Verify the Threat Intelligence integration is active and ingesting data.

### Vulnerability Data Missing for Affected CI
**Cause:** The CI may not have been scanned recently or the scanner integration may be down.
**Solution:** Query sn_vul_vulnerable_item without the CI filter to check if scan data exists. Verify the Vulnerability Response plugin and scanner integrations are active.

### Correlation Returns Too Many Results
**Cause:** Overly broad observable values (e.g., common DNS servers, internal subnet ranges).
**Solution:** Filter by observable type and confidence score. Use `confidenceGT50` to limit to higher-confidence indicators.

## Examples

**Example 1: Correlating a Phishing Incident**
1. Anchor incident SIR0005678 reports phishing email with malicious attachment
2. Extract observables: sender domain, attachment hash, embedded URL
3. Search sn_ti_observable for matching values across all incidents
4. Discover 3 other incidents with the same sender domain in the past week
5. Check sn_vul_vulnerable_item for the mail server CI to find related vulnerabilities
6. Document findings showing a phishing campaign targeting the organization

**Example 2: Lateral Movement Detection**
1. Incident SIR0009012 reports unauthorized access on a database server
2. Extract source IPs from observables and audit logs
3. Correlate source IPs against other incidents and syslog entries
4. Identify the same IP accessed 5 other servers in a 2-hour window
5. Cross-reference with vulnerability data to find exploited CVEs
6. Escalate as a coordinated intrusion with lateral movement

## Related Skills

- `security/incident-response` - Security incident handling procedures
- `secops/post-incident-analysis` - Post-incident review after correlation
- `secops/incident-summarization` - Summarize correlated incidents for stakeholders
- `secops/vulnerability-deduplication` - Deduplicate vulnerabilities found during correlation
- `secops/metrics-analysis` - Measure correlation effectiveness over time
