---
name: security-recommended-actions
version: 1.0.0
description: Generate recommended actions for security incidents based on threat type, severity, affected assets, and playbook alignment. Include containment, eradication, and recovery steps
author: Happy Technologies LLC
tags: [secops, security, incident-response, recommended-actions, containment, eradication, recovery, playbook]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sn_si_task
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/cmdb_ci
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_si_playbook
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Security Incident Recommended Actions

## Overview

This skill generates structured, prioritized response actions for security incidents by analyzing threat type, severity, affected assets, and organizational playbooks. It produces phased action plans covering containment, eradication, and recovery aligned with NIST SP 800-61 and organizational SOC procedures.

Key capabilities:
- **Threat-Specific Actions:** Generate actions tailored to the specific threat category (malware, phishing, data exfiltration, DDoS, insider threat, etc.)
- **Severity-Based Prioritization:** Scale response urgency and depth based on incident severity and business criticality
- **Asset-Aware Recommendations:** Adjust actions based on the type, environment, and criticality of affected assets
- **Playbook Alignment:** Map recommended actions to existing organizational playbooks and runbooks
- **Phased Response Plan:** Structure actions into containment, eradication, recovery, and post-incident phases
- **MITRE ATT&CK Mapping:** Reference specific ATT&CK techniques to guide detection and response

**When to use:**
- When a new security incident is created and the analyst needs response guidance
- During incident escalation to ensure all critical actions are covered
- For junior analysts who need structured guidance on response procedures
- When reviewing incident response completeness before closure
- To generate standardized response plans for recurring threat types

## Prerequisites

- **Roles:** `sn_si.analyst`, `sn_si.manager`, or `admin`
- **Plugins:** Security Incident Response (`sn_si`), Threat Intelligence (`sn_ti`), Vulnerability Response (`sn_vul`)
- **Access:** Read access to `sn_si_incident`, `sn_si_task`, `sn_ti_observable`, `cmdb_ci`, `sn_vul_vulnerable_item`
- **Knowledge:** Familiarity with NIST SP 800-61, MITRE ATT&CK framework, and organizational playbook structure

## Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_si_incident` | Security incidents | number, category, subcategory, priority, severity, state, cmdb_ci, attack_vector, kill_chain_phase, business_criticality |
| `sn_si_task` | Response tasks | number, short_description, state, task_type, security_incident, assigned_to, priority |
| `sn_ti_observable` | Threat indicators | type, value, confidence, threat_score, security_incident |
| `cmdb_ci` | Affected assets | name, sys_class_name, ip_address, os, environment, business_criticality |
| `sn_vul_vulnerable_item` | Known vulnerabilities | vulnerability, cmdb_ci, state, cvss_score, risk_score |

## Procedure

### Step 1: Retrieve Incident Details and Classification

Fetch the complete incident record with threat classification fields.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  fields: sys_id,number,short_description,description,category,subcategory,priority,severity,state,cmdb_ci,attack_vector,kill_chain_phase,business_criticality,risk_score,assigned_to,assignment_group,opened_at,contact_type,affected_user
```

**Using REST API:**
```bash
GET /api/now/table/sn_si_incident?sysparm_query=number=[SIR_NUMBER]&sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,severity,state,cmdb_ci,attack_vector,kill_chain_phase,business_criticality,risk_score,assigned_to,assignment_group,opened_at&sysparm_limit=1&sysparm_display_value=all
```

### Step 2: Gather Affected Asset Context

Retrieve configuration item details to understand the business context of affected systems.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_id=[CMDB_CI_SYS_ID]
  fields: sys_id,name,sys_class_name,ip_address,os,environment,business_criticality,support_group,department,location,operational_status
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci?sysparm_query=sys_id=[CI_SYS_ID]&sysparm_fields=sys_id,name,sys_class_name,ip_address,os,environment,business_criticality,support_group,department,location,operational_status&sysparm_limit=1&sysparm_display_value=true
```

### Step 3: Collect Threat Indicators

Pull IOCs to inform threat-specific containment and eradication actions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ti_observable
  query: security_incident=[INCIDENT_SYS_ID]
  fields: sys_id,type,value,source,confidence,threat_score,first_seen,last_seen
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_ti_observable?sysparm_query=security_incident=[INCIDENT_SYS_ID]&sysparm_fields=sys_id,type,value,source,confidence,threat_score&sysparm_limit=100
```

### Step 4: Check Known Vulnerabilities on Affected Assets

Identify exploitable vulnerabilities that may have enabled the attack.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_vul_vulnerable_item
  query: cmdb_ci=[AFFECTED_CI_SYS_ID]^stateINOpen,Under Investigation
  fields: sys_id,vulnerability,cmdb_ci,state,cvss_score,risk_score,first_found
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_vul_vulnerable_item?sysparm_query=cmdb_ci=[CI_SYS_ID]^stateINOpen,Under Investigation&sysparm_fields=sys_id,vulnerability,cmdb_ci,state,cvss_score,risk_score,first_found&sysparm_limit=20&sysparm_display_value=true
```

### Step 5: Review Existing Response Tasks

Check what tasks already exist to avoid duplication.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_task
  query: security_incident=[INCIDENT_SYS_ID]^ORDERBYopened_at
  fields: sys_id,number,short_description,state,task_type,assigned_to,priority
  limit: 50
```

### Step 6: Generate Recommended Actions

Produce phased, threat-specific response actions.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var sirNumber = 'SIR0009100'; // Replace with target incident
    var gr = new GlideRecord('sn_si_incident');
    gr.addQuery('number', sirNumber);
    gr.query();

    if (!gr.next()) { gs.info('Incident not found'); return; }

    var category = gr.category.getDisplayValue().toLowerCase();
    var severity = gr.severity.getDisplayValue();
    var priority = parseInt(gr.priority.toString()) || 3;
    var ciSysId = gr.cmdb_ci.toString();
    var actions = { containment: [], eradication: [], recovery: [], post_incident: [] };

    // Get CI details
    var ciType = 'unknown';
    var ciEnv = 'unknown';
    if (ciSysId) {
      var ci = new GlideRecord('cmdb_ci');
      if (ci.get(ciSysId)) {
        ciType = ci.sys_class_name.toString();
        ciEnv = ci.environment.getDisplayValue() || 'unknown';
      }
    }

    // Collect IOCs
    var iocCount = 0;
    var iocTypes = {};
    var obs = new GlideRecord('sn_ti_observable');
    obs.addQuery('security_incident', gr.sys_id.toString());
    obs.query();
    while (obs.next()) {
      iocCount++;
      var t = obs.type.getDisplayValue() || 'other';
      iocTypes[t] = (iocTypes[t] || 0) + 1;
    }

    // === CONTAINMENT ACTIONS ===
    // Universal containment
    actions.containment.push({
      action: 'Document initial findings and preserve volatile evidence',
      priority: 1, owner: 'SOC Analyst', timeline: 'Immediate',
      details: 'Capture memory dump, running processes, network connections before any changes'
    });

    if (category.indexOf('malware') >= 0 || category.indexOf('ransomware') >= 0) {
      actions.containment.push({
        action: 'Isolate affected host(s) from network',
        priority: 1, owner: 'Network Operations', timeline: '< 30 minutes',
        details: 'Apply network isolation via EDR or switch port disable. Do NOT power off to preserve memory.'
      });
      actions.containment.push({
        action: 'Block identified C2 IPs and domains at perimeter',
        priority: 1, owner: 'SOC Analyst', timeline: '< 1 hour',
        details: 'Update firewall rules and DNS sinkhole for ' + iocCount + ' identified IOCs'
      });
      actions.eradication.push({
        action: 'Remove malware artifacts and persistence mechanisms',
        priority: 1, owner: 'DFIR Team', timeline: '< 24 hours',
        details: 'Scan with updated signatures, check scheduled tasks, registry run keys, WMI subscriptions'
      });
      actions.recovery.push({
        action: 'Rebuild or restore affected systems from known-good baseline',
        priority: 2, owner: 'IT Operations', timeline: '24-48 hours',
        details: 'Reimage ' + (ciType.indexOf('server') >= 0 ? 'server' : 'workstation') + ' from golden image or verified backup'
      });
    }

    if (category.indexOf('phishing') >= 0) {
      actions.containment.push({
        action: 'Quarantine phishing email from all mailboxes',
        priority: 1, owner: 'Email Security', timeline: '< 1 hour',
        details: 'Use email security tool to search and purge by sender, subject, or message ID'
      });
      actions.containment.push({
        action: 'Reset credentials for affected user(s)',
        priority: 1, owner: 'IAM Team', timeline: '< 2 hours',
        details: 'Force password reset and revoke active sessions for compromised accounts'
      });
      actions.eradication.push({
        action: 'Block sender domain and update email filtering rules',
        priority: 2, owner: 'Email Security', timeline: '< 4 hours',
        details: 'Add sender to blocklist and create content filtering rule for similar messages'
      });
    }

    if (category.indexOf('data') >= 0 || category.indexOf('exfiltration') >= 0 || category.indexOf('breach') >= 0) {
      actions.containment.push({
        action: 'Identify and block data exfiltration channels',
        priority: 1, owner: 'SOC Analyst', timeline: '< 1 hour',
        details: 'Review DLP alerts, proxy logs, and cloud storage activity for ongoing exfiltration'
      });
      actions.containment.push({
        action: 'Revoke access for compromised accounts and API keys',
        priority: 1, owner: 'IAM Team', timeline: '< 2 hours',
        details: 'Disable affected service accounts, rotate API keys, revoke OAuth tokens'
      });
      actions.recovery.push({
        action: 'Assess data exposure scope and prepare regulatory notification',
        priority: 1, owner: 'Legal/Privacy Team', timeline: '< 72 hours',
        details: 'Determine data types affected, number of records, and applicable notification requirements'
      });
    }

    // Universal eradication
    actions.eradication.push({
      action: 'Patch exploited vulnerabilities on affected and similar systems',
      priority: 2, owner: 'Vulnerability Management', timeline: '< 72 hours',
      details: 'Apply patches for identified CVEs; scan environment for same vulnerability'
    });

    // Universal recovery
    actions.recovery.push({
      action: 'Validate system integrity and restore to operational status',
      priority: 2, owner: 'IT Operations', timeline: '48-72 hours',
      details: 'Verify clean state, run integrity checks, restore network connectivity with monitoring'
    });
    actions.recovery.push({
      action: 'Enhance monitoring on recovered systems for 30 days',
      priority: 3, owner: 'SOC Analyst', timeline: 'Ongoing',
      details: 'Increase logging verbosity, add detection rules for related IOCs and TTPs'
    });

    // Post-incident
    actions.post_incident.push({
      action: 'Conduct post-incident review and document lessons learned',
      priority: 3, owner: 'SOC Manager', timeline: '< 2 weeks post-resolution',
      details: 'Review detection time, response effectiveness, and identify process improvements'
    });
    actions.post_incident.push({
      action: 'Update playbooks and detection rules based on findings',
      priority: 3, owner: 'Detection Engineering', timeline: '< 30 days post-resolution',
      details: 'Create or update detection signatures, SIEM correlation rules, and response procedures'
    });

    var result = {
      incident: sirNumber,
      category: category,
      severity: severity,
      total_actions: actions.containment.length + actions.eradication.length + actions.recovery.length + actions.post_incident.length,
      phases: actions
    };

    gs.info('RECOMMENDED ACTIONS:\n' + JSON.stringify(result, null, 2));
  description: "SecOps: Generate phased response actions for a security incident"
```

### Step 7: Post Actions as Work Notes

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_si_incident
  sys_id: [INCIDENT_SYS_ID]
  work_notes: |
    === RECOMMENDED RESPONSE ACTIONS ===
    Generated: 2026-03-19 | Category: Ransomware | Severity: Critical

    PHASE 1 - CONTAINMENT (Immediate):
    [ ] Document findings and preserve volatile evidence (SOC Analyst, Immediate)
    [ ] Isolate affected hosts from network (Network Ops, < 30 min)
    [ ] Block C2 IPs/domains at perimeter (SOC Analyst, < 1 hour)

    PHASE 2 - ERADICATION (24-72 hours):
    [ ] Remove malware and persistence mechanisms (DFIR Team, < 24 hours)
    [ ] Patch exploited vulnerabilities (Vuln Mgmt, < 72 hours)

    PHASE 3 - RECOVERY (48-72 hours):
    [ ] Rebuild affected systems from known-good baseline (IT Ops, 24-48 hours)
    [ ] Validate system integrity (IT Ops, 48-72 hours)
    [ ] Enhance monitoring for 30 days (SOC Analyst, Ongoing)

    PHASE 4 - POST-INCIDENT (2-4 weeks):
    [ ] Conduct lessons learned review (SOC Manager, < 2 weeks)
    [ ] Update playbooks and detection rules (Detection Engineering, < 30 days)
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Read Incident | SN-Read-Record | GET /api/now/table/sn_si_incident/{sys_id} |
| Query Assets | SN-Query-Table | GET /api/now/table/cmdb_ci |
| Query IOCs | SN-Query-Table | GET /api/now/table/sn_ti_observable |
| Query Vulnerabilities | SN-Query-Table | GET /api/now/table/sn_vul_vulnerable_item |
| Generate Actions | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Post Actions | SN-Add-Work-Notes | PATCH /api/now/table/sn_si_incident/{sys_id} |

## Best Practices

- **Phase-Based Structure:** Always organize actions into containment, eradication, recovery, and post-incident phases per NIST SP 800-61
- **Threat-Specific Tailoring:** Customize actions for the specific threat type; generic actions waste analyst time
- **Evidence Preservation First:** Always recommend evidence preservation before containment actions that may alter system state
- **Owner Clarity:** Assign each action to a specific team or role, not just "the team"
- **Timeline Realism:** Set timelines that account for change management requirements in production environments
- **Deduplication:** Check existing tasks before generating recommendations to avoid redundancy
- **Escalation Triggers:** Include criteria for when to escalate (e.g., lateral movement detected, data exfiltration confirmed)

## Troubleshooting

### Incident Category Not Recognized

**Symptom:** Generated actions are too generic because the category does not match expected values
**Cause:** Organizations may use custom category and subcategory values
**Solution:** Query `sys_choice` for `sn_si_incident.category` to retrieve valid values. Map custom categories to standard threat types (malware, phishing, data breach, etc.).

### No IOCs Linked to Incident

**Symptom:** Threat-specific containment actions cannot be generated without IOCs
**Cause:** Threat intelligence may not be integrated or observables not yet linked
**Solution:** Recommend IOC collection as the first containment action. Search `sn_ti_observable` by date range for recently ingested indicators.

### Playbook Not Found for Category

**Symptom:** Actions cannot be aligned to an organizational playbook
**Cause:** The `sn_si_playbook` table may not contain a playbook for the incident category
**Solution:** Generate actions from the built-in threat taxonomy and recommend playbook creation as a post-incident action.

## Examples

### Example 1: Ransomware Incident Response Plan

**Scenario:** SIR0009100 -- LockBit ransomware detected on finance file server

1. Retrieve incident: Category "Ransomware", Severity "Critical", Production server
2. Gather asset context: FILESVR-03, Windows Server 2022, Business Criticality High
3. Collect 6 IOCs: 2 IPs, 1 domain, 2 file hashes, 1 email address
4. Identify 2 exploitable CVEs on affected server
5. Generate 12 actions across 4 phases with specific timelines and owners
6. Post checklist-format actions to incident work notes

### Example 2: Phishing Campaign Response

**Scenario:** SIR0008890 -- Credential harvesting phishing targeting 50 users

1. Retrieve incident: Category "Phishing", Severity "High", 50 affected users
2. No specific CI -- impacted entity is user mailboxes
3. IOCs: 1 sender domain, 1 phishing URL, 1 form submission endpoint
4. Generate 9 actions: email purge, credential reset, URL blocking, user notification
5. Include post-incident recommendation for phishing awareness training

## Related Skills

- `secops/incident-summarization` - Summarize the incident alongside recommended actions
- `secops/quality-assessment` - Assess whether recommended actions were properly executed
- `secops/post-incident-analysis` - Conduct detailed analysis after actions are completed
- `secops/correlation-insights` - Identify related incidents that may share response actions
- `secops/shift-handover` - Include pending actions in shift handover reports
