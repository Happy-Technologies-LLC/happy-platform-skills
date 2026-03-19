---
name: regulatory-alert-analysis
version: 1.0.0
description: Analyze regulatory alerts for business impact, identify affected policies, controls, and citations, and generate impact assessments with recommended actions for compliance teams
author: Happy Technologies LLC
tags: [grc, regulatory, alert, compliance, impact-assessment, citations, policy, regulatory-change]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_regulatory_alert
    - /api/now/table/sn_regulatory_change_task
    - /api/now/table/sn_compliance_policy
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_compliance_citation
    - /api/now/table/sn_compliance_control_objective
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_profile
  native:
    - Bash
complexity: advanced
estimated_time: 25-45 minutes
---

# Regulatory Alert Analysis

## Overview

This skill analyzes regulatory alerts in ServiceNow GRC to assess their business impact and drive compliance response. It covers:

- Retrieving and triaging incoming regulatory alerts by urgency and scope
- Identifying policies, controls, and citations affected by regulatory changes
- Generating structured impact assessments for compliance leadership
- Creating regulatory change tasks to track required updates
- Mapping alerts to existing compliance frameworks and control objectives
- Producing recommended action plans for the compliance team

**When to use:**
- When new regulatory alerts arrive requiring impact analysis
- During regulatory landscape monitoring and horizon scanning
- When regulations change and existing compliance programs need updating
- Before compliance committee meetings to present regulatory developments
- When assessing whether new regulations require new controls or policy updates

## Prerequisites

- **Roles:** `sn_compliance.manager`, `sn_grc.manager`, or `admin`
- **Plugins:** `com.sn_compliance`, `com.sn_grc`
- **Access:** Read/write to sn_regulatory_alert, sn_regulatory_change_task, sn_compliance_policy, sn_compliance_citation tables
- **Knowledge:** Understanding of applicable regulatory landscape and organizational compliance obligations

## Key Regulatory Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_regulatory_alert` | Incoming regulatory alerts | number, short_description, description, state, priority, regulation, authority, effective_date, alert_type, impact_level |
| `sn_regulatory_change_task` | Tasks to implement regulatory changes | number, short_description, state, assigned_to, due_date, alert, change_type |
| `sn_compliance_policy` | Compliance policies potentially affected | number, short_description, state, owner, policy_statement, effective_date |
| `sn_compliance_citation` | Regulatory citations requiring update | number, short_description, reference, regulation, authority, citation_text |
| `sn_compliance_control` | Controls affected by regulatory changes | number, short_description, state, control_objective, owner, effectiveness |
| `sn_compliance_control_objective` | Control objectives requiring revision | number, short_description, framework, effectiveness, owner |

## Procedure

### Step 1: Retrieve Pending Regulatory Alerts

Query unprocessed or recently received regulatory alerts.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_regulatory_alert
  query: active=true^stateIN1,2^ORDERBYDESCpriority
  fields: sys_id,number,short_description,description,state,priority,regulation,authority,effective_date,alert_type,impact_level,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_regulatory_alert?sysparm_query=active=true^stateIN1,2^ORDERBYDESCpriority&sysparm_fields=sys_id,number,short_description,description,state,priority,regulation,authority,effective_date,alert_type,impact_level&sysparm_limit=50
```

### Step 2: Identify Affected Citations and Regulations

For each alert, find existing citations that reference the same regulation or authority.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true^regulationLIKE[regulation_name]
  fields: sys_id,number,short_description,reference,regulation,authority,citation_text
  limit: 50
```

**Search by authority (e.g., SEC, CNIL, HHS):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true^authorityLIKE[authority_name]
  fields: sys_id,number,short_description,reference,regulation,authority,citation_text
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_compliance_citation?sysparm_query=active=true^regulationLIKE[regulation_name]&sysparm_fields=sys_id,number,short_description,reference,regulation,authority,citation_text&sysparm_limit=50
```

### Step 3: Identify Affected Policies

**Find policies linked to the affected regulation:**
```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_compliance_policy
  query: "active policies related to [regulation name] or [regulatory topic]"
  limit: 25
```

**Structured query for policy impact:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_policy
  query: active=true^short_descriptionLIKE[regulation_keyword]^ORdescriptionLIKE[regulation_keyword]
  fields: sys_id,number,short_description,state,owner,policy_statement,effective_date
  limit: 30
```

### Step 4: Identify Affected Controls and Objectives

**Query controls related to the affected regulation:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var regulationKeyword = 'GDPR'; // Replace with target regulation
    var affected = {
      controls: [],
      objectives: [],
      total_controls: 0,
      total_objectives: 0
    };

    // Find affected control objectives
    var obj = new GlideRecord('sn_compliance_control_objective');
    obj.addQuery('active', true);
    obj.addEncodedQuery('short_descriptionLIKE' + regulationKeyword + '^ORdescriptionLIKE' + regulationKeyword + '^ORframeworkLIKE' + regulationKeyword);
    obj.query();

    while (obj.next()) {
      affected.total_objectives++;
      affected.objectives.push({
        number: obj.number.toString(),
        title: obj.short_description.toString(),
        framework: obj.framework.getDisplayValue() || '',
        effectiveness: obj.effectiveness.getDisplayValue() || 'Not Assessed',
        owner: obj.owner.getDisplayValue()
      });

      // Find controls for each objective
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('control_objective', obj.sys_id.toString());
      ctrl.addQuery('active', true);
      ctrl.query();

      while (ctrl.next()) {
        affected.total_controls++;
        affected.controls.push({
          number: ctrl.number.toString(),
          title: ctrl.short_description.toString(),
          state: ctrl.state.getDisplayValue(),
          effectiveness: ctrl.effectiveness.getDisplayValue() || '',
          objective: obj.number.toString(),
          owner: ctrl.owner.getDisplayValue()
        });
      }
    }

    gs.info('AFFECTED CONTROLS AND OBJECTIVES:\n' + JSON.stringify(affected, null, 2));
  description: "GRC: Identify controls and objectives affected by a regulatory change"
```

### Step 5: Generate Impact Assessment

**Produce a structured impact assessment for the compliance team:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var alertNumber = 'REG0001234'; // Replace with target alert
    var gr = new GlideRecord('sn_regulatory_alert');
    gr.addQuery('number', alertNumber);
    gr.query();

    if (gr.next()) {
      var assessment = {
        alert: {
          number: gr.number.toString(),
          title: gr.short_description.toString(),
          description: gr.description.toString(),
          regulation: gr.regulation.getDisplayValue() || gr.regulation.toString(),
          authority: gr.authority.getDisplayValue() || gr.authority.toString(),
          effective_date: gr.effective_date.toString(),
          priority: gr.priority.getDisplayValue(),
          impact_level: gr.impact_level.getDisplayValue() || ''
        },
        impact_analysis: {
          affected_citations: 0,
          affected_policies: 0,
          affected_controls: 0,
          affected_objectives: 0,
          affected_profiles: 0
        },
        affected_citations: [],
        affected_policies: [],
        compliance_gaps: [],
        recommended_actions: [],
        timeline: {}
      };

      var regName = gr.regulation.toString() || gr.short_description.toString();

      // Count affected citations
      var cite = new GlideRecord('sn_compliance_citation');
      cite.addEncodedQuery('regulationLIKE' + regName + '^ORauthorityLIKE' + regName);
      cite.addQuery('active', true);
      cite.query();
      while (cite.next()) {
        assessment.impact_analysis.affected_citations++;
        assessment.affected_citations.push({
          number: cite.number.toString(),
          reference: cite.reference.toString(),
          title: cite.short_description.toString()
        });
      }

      // Count affected policies
      var pol = new GlideRecord('sn_compliance_policy');
      pol.addEncodedQuery('short_descriptionLIKE' + regName + '^ORdescriptionLIKE' + regName);
      pol.addQuery('active', true);
      pol.query();
      while (pol.next()) {
        assessment.impact_analysis.affected_policies++;
        assessment.affected_policies.push({
          number: pol.number.toString(),
          title: pol.short_description.toString(),
          owner: pol.owner.getDisplayValue(),
          state: pol.state.getDisplayValue()
        });
      }

      // Count affected controls
      var ctrl = new GlideAggregate('sn_compliance_control');
      ctrl.addEncodedQuery('short_descriptionLIKE' + regName + '^ORdescriptionLIKE' + regName);
      ctrl.addQuery('active', true);
      ctrl.addAggregate('COUNT');
      ctrl.query();
      if (ctrl.next()) assessment.impact_analysis.affected_controls = parseInt(ctrl.getAggregate('COUNT'));

      // Determine impact level and timeline
      var priority = parseInt(gr.priority) || 3;
      var effectiveDate = gr.effective_date.toString();

      if (priority <= 2 || assessment.impact_analysis.affected_policies >= 3) {
        assessment.timeline = {
          impact_level: 'HIGH',
          initial_review_days: 5,
          policy_update_days: 30,
          control_update_days: 60,
          full_compliance_days: 90,
          escalation: 'Immediate notification to Chief Compliance Officer and General Counsel'
        };
      } else if (priority == 3) {
        assessment.timeline = {
          impact_level: 'MEDIUM',
          initial_review_days: 10,
          policy_update_days: 60,
          control_update_days: 90,
          full_compliance_days: 120,
          escalation: 'Include in next compliance committee agenda'
        };
      } else {
        assessment.timeline = {
          impact_level: 'LOW',
          initial_review_days: 30,
          policy_update_days: 90,
          control_update_days: 120,
          full_compliance_days: 180,
          escalation: 'Standard quarterly reporting'
        };
      }

      // Generate recommended actions
      if (assessment.impact_analysis.affected_citations > 0) {
        assessment.recommended_actions.push('Review and update ' + assessment.impact_analysis.affected_citations + ' affected citations to reflect new regulatory language');
      }
      if (assessment.impact_analysis.affected_policies > 0) {
        assessment.recommended_actions.push('Revise ' + assessment.impact_analysis.affected_policies + ' policies to align with updated regulatory requirements');
      }
      if (assessment.impact_analysis.affected_controls > 0) {
        assessment.recommended_actions.push('Reassess ' + assessment.impact_analysis.affected_controls + ' controls for continued effectiveness under new requirements');
      }
      if (assessment.impact_analysis.affected_citations === 0) {
        assessment.recommended_actions.push('Create new compliance citations to capture this regulatory requirement');
      }
      assessment.recommended_actions.push('Conduct training and awareness for affected control owners');
      assessment.recommended_actions.push('Schedule post-implementation review to verify compliance');

      gs.info('REGULATORY IMPACT ASSESSMENT:\n' + JSON.stringify(assessment, null, 2));
    }
  description: "GRC: Generate regulatory alert impact assessment"
```

### Step 6: Create Regulatory Change Tasks

**Create tasks to track compliance response activities:**

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_regulatory_change_task
  fields:
    short_description: "Update data privacy policies for GDPR amendment on AI processing"
    description: "Review and update all data privacy policies to address new GDPR requirements for AI-based data processing. Ensure updated policies reference new Article 22a requirements for algorithmic transparency."
    assigned_to: [compliance_manager_sys_id]
    due_date: 2026-05-15
    priority: 2
    state: 1
    alert: [regulatory_alert_sys_id]
    change_type: policy_update
```

**Using REST API:**
```bash
POST /api/now/table/sn_regulatory_change_task
Content-Type: application/json

{
  "short_description": "Update data privacy policies for GDPR amendment on AI processing",
  "description": "Review and update data privacy policies for new GDPR AI processing requirements.",
  "assigned_to": "[user_sys_id]",
  "due_date": "2026-05-15",
  "priority": "2",
  "state": "1",
  "alert": "[alert_sys_id]"
}
```

**Create additional tasks for control updates:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_regulatory_change_task
  fields:
    short_description: "Reassess access controls for updated GDPR AI transparency requirements"
    description: "Evaluate existing access controls and data processing controls against new GDPR AI requirements. Design additional controls if gaps are identified. Update control testing procedures."
    assigned_to: [control_owner_sys_id]
    due_date: 2026-06-30
    priority: 2
    state: 1
    alert: [regulatory_alert_sys_id]
    change_type: control_update
```

### Step 7: Update Alert with Assessment Results

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_regulatory_alert
  sys_id: [alert_sys_id]
  fields:
    work_notes: |
      === IMPACT ASSESSMENT COMPLETED ===
      Assessment Date: 2026-03-19
      Impact Level: HIGH

      Affected Components:
      - Citations: 4 existing citations require update
      - Policies: 2 policies require revision
      - Controls: 8 controls require reassessment
      - Objectives: 3 control objectives may need update

      Regulatory Change Tasks Created: 3
      Target Compliance Date: 2026-06-30
      Escalation: CCO and General Counsel notified

      Recommended Actions:
      1. Update citations with new regulatory language
      2. Revise affected policies within 30 days
      3. Reassess controls within 60 days
      4. Conduct control owner training
    state: 3
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_regulatory_alert/[sys_id]
Content-Type: application/json

{
  "work_notes": "Impact assessment completed. HIGH impact. 3 change tasks created.",
  "state": "3"
}
```

### Step 8: Generate Regulatory Landscape Dashboard Data

**Produce aggregate data for compliance dashboard:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var dashboard = {
      generated_date: new GlideDateTime().toString(),
      alert_summary: { total_open: 0, high_impact: 0, medium_impact: 0, low_impact: 0, overdue: 0 },
      by_regulation: {},
      by_authority: {},
      pending_tasks: { total: 0, overdue: 0 },
      recent_alerts: []
    };

    var now = new GlideDateTime();

    // Alert overview
    var gr = new GlideRecord('sn_regulatory_alert');
    gr.addQuery('active', true);
    gr.orderByDesc('sys_created_on');
    gr.query();

    while (gr.next()) {
      dashboard.alert_summary.total_open++;

      var pri = parseInt(gr.priority) || 3;
      if (pri <= 2) dashboard.alert_summary.high_impact++;
      else if (pri == 3) dashboard.alert_summary.medium_impact++;
      else dashboard.alert_summary.low_impact++;

      // Regulation breakdown
      var reg = gr.regulation.getDisplayValue() || 'Unspecified';
      dashboard.by_regulation[reg] = (dashboard.by_regulation[reg] || 0) + 1;

      // Authority breakdown
      var auth = gr.authority.getDisplayValue() || 'Unspecified';
      dashboard.by_authority[auth] = (dashboard.by_authority[auth] || 0) + 1;

      // Recent alerts (top 5)
      if (dashboard.recent_alerts.length < 5) {
        dashboard.recent_alerts.push({
          number: gr.number.toString(),
          title: gr.short_description.toString(),
          regulation: reg,
          priority: gr.priority.getDisplayValue(),
          effective_date: gr.effective_date.toString(),
          created: gr.sys_created_on.toString()
        });
      }
    }

    // Pending regulatory change tasks
    var task = new GlideRecord('sn_regulatory_change_task');
    task.addQuery('active', true);
    task.query();
    while (task.next()) {
      dashboard.pending_tasks.total++;
      if (task.due_date.toString() && new GlideDateTime(task.due_date.toString()).compareTo(now) < 0) {
        dashboard.pending_tasks.overdue++;
      }
    }

    gs.info('REGULATORY LANDSCAPE DASHBOARD:\n' + JSON.stringify(dashboard, null, 2));
  description: "GRC: Generate regulatory landscape dashboard data"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Alerts | SN-Query-Table | GET /api/now/table/sn_regulatory_alert |
| Search Alerts | SN-Natural-Language-Search | N/A |
| Query Citations | SN-Query-Table | GET /api/now/table/sn_compliance_citation |
| Query Policies | SN-Query-Table | GET /api/now/table/sn_compliance_policy |
| Create Change Tasks | SN-Create-Record | POST /api/now/table/sn_regulatory_change_task |
| Update Alert | SN-Update-Record | PATCH /api/now/table/sn_regulatory_alert |
| Impact Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Timely Triage:** Process regulatory alerts within 48 hours of receipt; high-impact alerts within 24 hours
- **Regulatory Mapping:** Always map alerts to specific citations and policies, not just general framework references
- **Effective Date Tracking:** Prioritize based on compliance deadline proximity, not just severity
- **Stakeholder Communication:** Notify affected policy and control owners immediately upon completing impact assessment
- **Cross-Regulation Analysis:** Check if a single regulatory change affects multiple compliance frameworks
- **Evidence Preservation:** Document the original alert text and assessment rationale in work notes for audit trail
- **Feedback Loop:** After implementing changes, validate with legal counsel that the response adequately addresses the regulatory requirement

## Troubleshooting

### Regulatory Alert Table Not Found

**Symptom:** Query to `sn_regulatory_alert` returns table not found
**Cause:** The table may be named differently or require an additional plugin
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_regulatory_alert
```
If not found, check for `sn_compliance_alert`, `sn_grc_regulatory_alert`, or `sn_reg_change_alert`. The Regulatory Change Management module may require `com.sn_compliance_regulatory` plugin.

### No Citation Matches for Alert

**Symptom:** Impact analysis finds no matching citations for a regulatory alert
**Cause:** Citations may not yet exist for the new regulation, or naming conventions differ
**Solution:** Broaden the search to use keywords from the alert description rather than exact regulation name. If no citations exist, the recommended action should include creating new citation records.

### Regulatory Change Task Table Unavailable

**Symptom:** Cannot create records in `sn_regulatory_change_task`
**Cause:** The table may require additional plugin activation or use an alternative table
**Solution:** Fall back to `sn_compliance_task` for tracking regulatory change activities. Set a category or tag field to distinguish regulatory change tasks from other compliance tasks.

### Alert Effective Date Parsing Issues

**Symptom:** Effective date comparisons fail or return incorrect results
**Cause:** Date format inconsistencies between alert source and ServiceNow internal format
**Solution:** Use `GlideDateTime` for all date comparisons. If the effective_date field is a string rather than a date type, parse it before comparison.

## Examples

### Example 1: GDPR Amendment Impact Analysis

**Scenario:** New GDPR amendment on AI transparency requires analysis

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_regulatory_alert
  query: "GDPR amendments or updates related to artificial intelligence or automated processing"
  limit: 10
```

**Impact Assessment Output:**
- **Alert:** REG0002341 - GDPR Amendment: AI Transparency Requirements
- **Authority:** European Data Protection Board
- **Effective Date:** 2026-09-01
- **Impact Level:** HIGH
- **Affected Citations:** 4 (Articles 13, 14, 15, 22)
- **Affected Policies:** 2 (Data Privacy Policy, AI Ethics Policy)
- **Affected Controls:** 6 (consent management, algorithmic transparency, data subject access)
- **Recommended Actions:**
  1. Update privacy notices to include AI processing disclosures (by June 2026)
  2. Implement algorithmic impact assessment process (by July 2026)
  3. Revise data subject access request workflow for AI decisions (by August 2026)
  4. Train data processing teams on new requirements (by August 2026)

### Example 2: Multi-Regulation Alert Triage

**Scenario:** Compliance team needs to triage a batch of recent regulatory alerts

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_regulatory_alert
  query: active=true^state=1^ORDERBYpriority
  fields: sys_id,number,short_description,regulation,authority,priority,effective_date
  limit: 20
```

**Triage Output:**
| Alert | Regulation | Priority | Effective Date | Action |
|-------|------------|----------|---------------|--------|
| REG0002341 | GDPR | Critical | 2026-09-01 | Full impact assessment required |
| REG0002342 | SOX | High | 2026-07-01 | Review ICFR controls |
| REG0002343 | HIPAA | High | 2026-08-15 | Update PHI handling procedures |
| REG0002344 | PCI-DSS | Medium | 2026-12-01 | Schedule Q3 control review |
| REG0002345 | Local Privacy | Low | 2027-01-01 | Monitor; include in quarterly review |

## Related Skills

- `grc/control-objective-management` - Update control objectives affected by regulatory changes
- `grc/issue-action-plan` - Create action plans for compliance issues from regulatory gaps
- `grc/issue-summarization` - Summarize issues created from regulatory alert findings
- `grc/risk-assessment-summarization` - Assess risk impact of regulatory changes
- `security/audit-compliance` - Audit trail for regulatory response activities

## References

- [ServiceNow Regulatory Change Management](https://docs.servicenow.com/bundle/utah-governance-risk-compliance/page/product/compliance/concept/regulatory-change-management.html)
- [Thomson Reuters Regulatory Intelligence](https://www.thomsonreuters.com/en/products-services/risk-fraud-and-compliance/regulatory-intelligence.html)
- [GDPR Official Text](https://gdpr-info.eu/)
- [SOX Compliance Guide](https://www.sarbanes-oxley-101.com/)
- [HIPAA Regulatory Updates](https://www.hhs.gov/hipaa/index.html)
