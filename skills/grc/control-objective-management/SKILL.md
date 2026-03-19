---
name: control-objective-management
version: 1.0.0
description: Manage control objectives including creation, assessment, effectiveness evaluation, regulatory mapping, and gap identification across SOX, GDPR, and HIPAA frameworks
author: Happy Technologies LLC
tags: [grc, compliance, control-objective, sox, gdpr, hipaa, control-gap, effectiveness]
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
    - /api/now/table/sn_compliance_control_objective
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_compliance_policy
    - /api/now/table/sn_compliance_citation
    - /api/now/table/sn_compliance_task
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_issue
  native:
    - Bash
complexity: advanced
estimated_time: 25-50 minutes
---

# Control Objective Management

## Overview

This skill provides comprehensive management of compliance control objectives in ServiceNow GRC. It covers:

- Creating and updating control objectives with regulatory context
- Assessing control effectiveness through testing and evidence review
- Mapping control objectives to SOX, GDPR, HIPAA, and other regulatory requirements
- Identifying control gaps where objectives lack adequate controls or testing
- Analyzing control coverage across profiles, policies, and citations
- Generating control effectiveness reports for audit and compliance review

**When to use:**
- When establishing or updating a control framework for regulatory compliance
- During control effectiveness assessments and testing cycles
- When mapping controls to new or changing regulatory requirements
- To identify gaps in control coverage across business processes
- When preparing for SOX, GDPR, HIPAA, or other regulatory audits
- During annual control rationalization and optimization exercises

## Prerequisites

- **Roles:** `sn_compliance.manager`, `sn_grc.manager`, or `admin`
- **Plugins:** `com.sn_compliance`, `com.sn_grc`
- **Access:** Read/write to sn_compliance_control_objective, sn_compliance_control, sn_compliance_policy, sn_compliance_citation tables
- **Knowledge:** Understanding of compliance frameworks (SOX, GDPR, HIPAA) and control design principles

## Key Compliance Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_compliance_control_objective` | Control objectives | number, short_description, description, state, owner, policy, framework, effectiveness |
| `sn_compliance_control` | Controls implementing objectives | number, short_description, state, control_objective, owner, effectiveness, test_result, test_date, profile |
| `sn_compliance_policy` | Compliance policies | number, short_description, state, owner, policy_statement, effective_date |
| `sn_compliance_citation` | Regulatory citations | number, short_description, reference, regulation, authority, citation_text |
| `sn_compliance_task` | Compliance tasks | number, short_description, state, assigned_to, due_date, control |
| `sn_grc_profile` | GRC entity profiles | number, short_description, profile_type, applies_to |

## Procedure

### Step 1: Retrieve Existing Control Objectives

Query current control objectives to understand the baseline framework.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control_objective
  query: active=true^ORDERBYnumber
  fields: sys_id,number,short_description,description,state,owner,policy,framework,effectiveness,sys_created_on,sys_updated_on
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_compliance_control_objective?sysparm_query=active=true^ORDERBYnumber&sysparm_fields=sys_id,number,short_description,description,state,owner,policy,framework,effectiveness&sysparm_limit=100
```

### Step 2: Create a New Control Objective

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_compliance_control_objective
  fields:
    short_description: "Ensure access to personal data is restricted to authorized personnel"
    description: "Control objective to verify that access controls are in place to restrict personal data access per GDPR Article 25 and Article 32 requirements. Includes role-based access, least privilege enforcement, and periodic access reviews."
    owner: [owner_sys_id]
    policy: [policy_sys_id]
    state: draft
    framework: GDPR
```

**Using REST API:**
```bash
POST /api/now/table/sn_compliance_control_objective
Content-Type: application/json

{
  "short_description": "Ensure access to personal data is restricted to authorized personnel",
  "description": "Control objective to verify access controls per GDPR Article 25 and 32.",
  "owner": "[owner_sys_id]",
  "policy": "[policy_sys_id]",
  "state": "draft",
  "framework": "GDPR"
}
```

### Step 3: Map Control Objectives to Regulatory Citations

**Query existing citations for mapping:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true^regulationLIKEGDPR
  fields: sys_id,number,short_description,reference,regulation,authority,citation_text
  limit: 50
```

**Map objectives to SOX citations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true^regulationLIKESOX^ORregulationLIKESarbanes
  fields: sys_id,number,short_description,reference,regulation,authority
  limit: 50
```

**Map objectives to HIPAA citations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true^regulationLIKEHIPAA
  fields: sys_id,number,short_description,reference,regulation,authority
  limit: 50
```

### Step 4: Assess Control Effectiveness

**Query controls and their test results for a specific objective:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control
  query: control_objective=[objective_sys_id]^active=true
  fields: sys_id,number,short_description,state,effectiveness,test_result,test_date,owner,profile
  limit: 50
```

**Generate effectiveness assessment across all objectives:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var assessment = {
      generated_date: new GlideDateTime().toString(),
      total_objectives: 0,
      effectiveness_summary: { effective: 0, partially_effective: 0, ineffective: 0, not_tested: 0 },
      by_framework: {},
      objectives_detail: []
    };

    var obj = new GlideRecord('sn_compliance_control_objective');
    obj.addQuery('active', true);
    obj.query();

    while (obj.next()) {
      assessment.total_objectives++;

      var framework = obj.framework.getDisplayValue() || 'General';
      if (!assessment.by_framework[framework]) {
        assessment.by_framework[framework] = { total: 0, effective: 0, gaps: 0 };
      }
      assessment.by_framework[framework].total++;

      // Query controls for this objective
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('control_objective', obj.sys_id.toString());
      ctrl.addQuery('active', true);
      ctrl.query();

      var totalControls = 0, passingControls = 0, failingControls = 0, untestedControls = 0;
      while (ctrl.next()) {
        totalControls++;
        var testResult = ctrl.test_result.getDisplayValue().toLowerCase();
        var state = ctrl.state.getDisplayValue().toLowerCase();

        if (testResult === 'pass' || state === 'compliant') passingControls++;
        else if (testResult === 'fail' || state === 'non-compliant') failingControls++;
        else untestedControls++;
      }

      // Determine effectiveness
      var effectiveness = 'Not Tested';
      if (totalControls === 0) {
        effectiveness = 'No Controls';
      } else if (failingControls === 0 && untestedControls === 0) {
        effectiveness = 'Effective';
        assessment.effectiveness_summary.effective++;
        assessment.by_framework[framework].effective++;
      } else if (failingControls === 0 && passingControls > 0) {
        effectiveness = 'Partially Effective';
        assessment.effectiveness_summary.partially_effective++;
      } else if (failingControls > 0) {
        effectiveness = 'Ineffective';
        assessment.effectiveness_summary.ineffective++;
        assessment.by_framework[framework].gaps++;
      } else {
        assessment.effectiveness_summary.not_tested++;
      }

      assessment.objectives_detail.push({
        number: obj.number.toString(),
        title: obj.short_description.toString(),
        framework: framework,
        total_controls: totalControls,
        passing: passingControls,
        failing: failingControls,
        untested: untestedControls,
        effectiveness: effectiveness
      });
    }

    gs.info('CONTROL EFFECTIVENESS ASSESSMENT:\n' + JSON.stringify(assessment, null, 2));
  description: "GRC: Assess control effectiveness across all objectives"
```

### Step 5: Identify Control Gaps

**Find objectives without adequate control coverage:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gaps = [];

    var obj = new GlideRecord('sn_compliance_control_objective');
    obj.addQuery('active', true);
    obj.query();

    while (obj.next()) {
      var ctrl = new GlideAggregate('sn_compliance_control');
      ctrl.addQuery('control_objective', obj.sys_id.toString());
      ctrl.addQuery('active', true);
      ctrl.addAggregate('COUNT');
      ctrl.query();

      var controlCount = 0;
      if (ctrl.next()) controlCount = parseInt(ctrl.getAggregate('COUNT'));

      // Gap: No controls or all controls failing
      if (controlCount === 0) {
        gaps.push({
          type: 'NO_CONTROLS',
          objective_number: obj.number.toString(),
          objective_title: obj.short_description.toString(),
          framework: obj.framework.getDisplayValue() || 'General',
          owner: obj.owner.getDisplayValue(),
          severity: 'CRITICAL',
          recommendation: 'Design and implement controls to address this objective'
        });
      } else {
        // Check for all-failing scenario
        var failCtrl = new GlideAggregate('sn_compliance_control');
        failCtrl.addQuery('control_objective', obj.sys_id.toString());
        failCtrl.addQuery('active', true);
        failCtrl.addQuery('state', 'NOT IN', 'compliant,passed');
        failCtrl.addAggregate('COUNT');
        failCtrl.query();

        var failCount = 0;
        if (failCtrl.next()) failCount = parseInt(failCtrl.getAggregate('COUNT'));

        if (failCount === controlCount) {
          gaps.push({
            type: 'ALL_CONTROLS_FAILING',
            objective_number: obj.number.toString(),
            objective_title: obj.short_description.toString(),
            framework: obj.framework.getDisplayValue() || 'General',
            total_controls: controlCount,
            failing_controls: failCount,
            severity: 'HIGH',
            recommendation: 'All controls ineffective; redesign control approach or add compensating controls'
          });
        }

        // Check for stale testing (no test in last 180 days)
        var staleCtrl = new GlideRecord('sn_compliance_control');
        staleCtrl.addQuery('control_objective', obj.sys_id.toString());
        staleCtrl.addQuery('active', true);
        staleCtrl.addQuery('test_date', '<', gs.daysAgo(180));
        staleCtrl.query();
        var staleCount = staleCtrl.getRowCount();

        if (staleCount > 0) {
          gaps.push({
            type: 'STALE_TESTING',
            objective_number: obj.number.toString(),
            objective_title: obj.short_description.toString(),
            framework: obj.framework.getDisplayValue() || 'General',
            stale_controls: staleCount,
            severity: 'MEDIUM',
            recommendation: 'Schedule control re-testing; ' + staleCount + ' controls not tested in 180+ days'
          });
        }
      }
    }

    gaps.sort(function(a, b) {
      var sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    });

    gs.info('CONTROL GAPS IDENTIFIED: ' + gaps.length + '\n' + JSON.stringify(gaps, null, 2));
  description: "GRC: Identify control gaps across all objectives"
```

### Step 6: Update Control Objective with Assessment Results

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_compliance_control_objective
  sys_id: [objective_sys_id]
  fields:
    effectiveness: effective
    work_notes: |
      === CONTROL EFFECTIVENESS ASSESSMENT ===
      Assessment Date: 2026-03-19
      Total Controls: 5
      Passing: 4 (80%)
      Failing: 0
      Untested: 1
      Overall Effectiveness: Effective

      Regulatory Mapping: SOX Section 404, GDPR Article 32
      Next Review: 2026-06-19
    state: reviewed
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_compliance_control_objective/[sys_id]
Content-Type: application/json

{
  "effectiveness": "effective",
  "work_notes": "Control effectiveness assessment completed. 4/5 controls passing.",
  "state": "reviewed"
}
```

### Step 7: Create Compliance Tasks for Gap Remediation

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_compliance_task
  fields:
    short_description: "Design controls for unaddressed control objective CO0001456"
    description: "Control objective CO0001456 has no implementing controls. Design and implement at least one preventive and one detective control. Map to GDPR Article 32 requirements for data processing security."
    assigned_to: [control_owner_sys_id]
    due_date: 2026-05-01
    priority: 2
    state: 1
```

**Using REST API:**
```bash
POST /api/now/table/sn_compliance_task
Content-Type: application/json

{
  "short_description": "Design controls for unaddressed control objective CO0001456",
  "description": "No implementing controls exist. Design preventive and detective controls.",
  "assigned_to": "[owner_sys_id]",
  "due_date": "2026-05-01",
  "priority": "2",
  "state": "1"
}
```

## Regulatory Framework Context

### SOX (Sarbanes-Oxley Act)

| Section | Control Objective Focus | Key Fields |
|---------|------------------------|------------|
| Section 302 | CEO/CFO certification of financial controls | Disclosure controls, material weakness |
| Section 404 | Internal control over financial reporting (ICFR) | Control design, operating effectiveness |
| Section 409 | Real-time disclosure of material changes | Monitoring controls, event-driven assessments |

### GDPR (General Data Protection Regulation)

| Article | Control Objective Focus | Key Fields |
|---------|------------------------|------------|
| Article 25 | Data protection by design and default | Privacy controls, data minimization |
| Article 30 | Records of processing activities | Processing inventory controls |
| Article 32 | Security of processing | Technical and organizational measures |
| Article 35 | Data protection impact assessment | DPIA process controls |

### HIPAA (Health Insurance Portability and Accountability Act)

| Rule | Control Objective Focus | Key Fields |
|------|------------------------|------------|
| 164.312(a) | Access controls | Unique user ID, emergency access, auto-logoff |
| 164.312(c) | Integrity controls | Mechanism to authenticate ePHI |
| 164.312(d) | Authentication | Person or entity authentication |
| 164.312(e) | Transmission security | Encryption, integrity controls |

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Objectives | SN-Query-Table | GET /api/now/table/sn_compliance_control_objective |
| Create Objective | SN-Create-Record | POST /api/now/table/sn_compliance_control_objective |
| Update Objective | SN-Update-Record | PATCH /api/now/table/sn_compliance_control_objective |
| Query Controls | SN-Query-Table | GET /api/now/table/sn_compliance_control |
| Query Citations | SN-Query-Table | GET /api/now/table/sn_compliance_citation |
| Gap Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Framework Alignment:** Always map objectives to specific regulatory articles or sections, not just framework names
- **Control Layering:** Each objective should have both preventive and detective controls for defense in depth
- **Testing Cadence:** Establish risk-based testing frequencies -- critical controls quarterly, standard controls annually
- **Gap Prioritization:** Prioritize gaps by regulatory exposure and business impact, not just count
- **Ownership Model:** Assign both a control objective owner (strategic) and control owners (operational)
- **Evidence Standards:** Define acceptable evidence types for each control before testing begins
- **Cross-Framework Mapping:** Identify controls satisfying multiple frameworks to reduce duplication

## Troubleshooting

### Control Objective Table Not Found

**Symptom:** Query to `sn_compliance_control_objective` returns table not found error
**Cause:** The Compliance plugin may not be activated or may use a different table name
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_compliance_control_objective
```
If not found, check for alternative tables like `sn_compliance_objective` or `sn_grc_control_objective`. Verify `com.sn_compliance` plugin is active.

### Framework Field Not Available

**Symptom:** The `framework` field does not exist on control objective records
**Cause:** Framework tracking may use a reference field to a separate framework table or a custom field
**Solution:** Check the schema for fields like `regulation`, `compliance_framework`, or a reference to `sn_compliance_citation`. Use category or policy reference as an alternative grouping mechanism.

### Control-to-Objective Link Missing

**Symptom:** Controls exist but are not linked to control objectives
**Cause:** The `control_objective` reference field on `sn_compliance_control` may not be populated
**Solution:** Check if controls are linked via `sn_grc_item` or through a many-to-many relationship table. Query `sn_grc_m2m_control_objective_control` if it exists.

## Examples

### Example 1: SOX 404 Control Objective Assessment

**Scenario:** Preparing for annual SOX audit, need to assess ICFR control objectives

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_compliance_control_objective
  query: "SOX Section 404 control objectives for internal control over financial reporting"
  limit: 30
```

**Assessment Output:**
- **Total SOX Objectives:** 24
- **Effective:** 18 (75%)
- **Partially Effective:** 4 (17%) -- untested controls pending Q1 review
- **Ineffective:** 1 (4%) -- segregation of duties control failure
- **No Controls:** 1 (4%) -- new objective added for IT general controls
- **Key Gap:** CO0002341 - "IT change management controls over financial systems" has no implementing controls
- **Action Required:** Create 2 compliance tasks for gap remediation before audit fieldwork

### Example 2: GDPR Control Coverage Analysis

**Scenario:** DPO needs to verify control coverage for GDPR compliance

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control_objective
  query: active=true^frameworkLIKEGDPR^ORdescriptionLIKEGDPR
  fields: sys_id,number,short_description,state,effectiveness,owner
  limit: 50
```

**Coverage Report:**
- **GDPR Objectives Defined:** 15
- **With Active Controls:** 12 (80% coverage)
- **Fully Effective:** 9 (60%)
- **Gaps Identified:**
  1. Article 17 (Right to Erasure) -- no automated deletion control
  2. Article 20 (Data Portability) -- export mechanism untested
  3. Article 35 (DPIA) -- process control not yet implemented
- **Recommendation:** Prioritize Article 17 gap as it carries highest regulatory fine risk

## Related Skills

- `grc/issue-action-plan` - Remediate issues arising from control failures
- `grc/issue-summarization` - Summarize issues linked to control gaps
- `grc/risk-assessment-summarization` - Assess risks mitigated by controls
- `grc/regulatory-alert-analysis` - Track regulatory changes affecting control requirements
- `security/audit-compliance` - Audit trail for control testing evidence

## References

- [ServiceNow Compliance Management](https://docs.servicenow.com/bundle/utah-governance-risk-compliance/page/product/compliance/concept/compliance-management.html)
- [SOX Section 404 Compliance](https://www.sarbanes-oxley-101.com/sarbanes-oxley-404.htm)
- [GDPR Official Text](https://gdpr-info.eu/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [NIST SP 800-53 Security Controls](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
