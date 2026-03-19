---
name: issue-action-plan
version: 1.0.0
description: Generate comprehensive action plans for GRC issues including remediation steps, responsible parties, timelines, and success criteria prioritized by risk rating and compliance impact
author: Happy Technologies LLC
tags: [grc, issue, action-plan, remediation, compliance, risk, governance]
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
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_compliance_task
    - /api/now/table/sn_grc_item
    - /api/now/table/sn_grc_profile
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# GRC Issue Action Plan Generation

## Overview

This skill generates structured action plans for Governance, Risk, and Compliance (GRC) issues in ServiceNow. It covers:

- Retrieving and analyzing open GRC issues with their associated risks, controls, and profiles
- Prioritizing issues based on risk rating, compliance impact, and business criticality
- Generating remediation steps with responsible parties and deadlines
- Defining measurable success criteria and verification checkpoints
- Creating compliance tasks to track remediation progress
- Producing audit-ready documentation of action plans

**When to use:**
- When GRC issues require formal remediation planning
- After audit findings that need structured response plans
- When compliance gaps demand documented corrective actions
- During periodic risk reviews requiring action plan updates
- When management requests prioritized issue resolution roadmaps

## Prerequisites

- **Roles:** `sn_grc.manager`, `sn_compliance.manager`, or `admin`
- **Plugins:** `com.sn_grc`, `com.sn_compliance`, `com.sn_risk`
- **Access:** Read/write to sn_grc_issue, sn_compliance_task, sn_grc_risk tables
- **Knowledge:** Understanding of organizational risk appetite and compliance frameworks

## Key GRC Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_grc_issue` | GRC issues and findings | number, short_description, state, priority, risk_rating, profile, item |
| `sn_grc_risk` | Risk records | number, short_description, risk_score, state, treatment, profile |
| `sn_compliance_control` | Compliance controls | number, short_description, state, control_objective, owner |
| `sn_compliance_task` | Compliance remediation tasks | number, short_description, state, assigned_to, due_date |
| `sn_grc_item` | GRC content items | number, short_description, item_type, profile |
| `sn_grc_profile` | GRC entity profiles | number, short_description, profile_type, applies_to |

## Procedure

### Step 1: Retrieve Open GRC Issues

Query all open GRC issues sorted by risk rating and priority.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_issue
  query: active=true^stateIN1,2,3^ORDERBYDESCrisk_rating
  fields: sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_issue?sysparm_query=active=true^stateIN1,2,3^ORDERBYDESCrisk_rating&sysparm_fields=sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category&sysparm_limit=50
```

### Step 2: Analyze Related Risks and Controls

For each high-priority issue, retrieve associated risk and control context.

**Fetch related risks:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: profile=[issue_profile_sys_id]^active=true
  fields: sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category
  limit: 20
```

**Fetch related controls:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control
  query: profile=[issue_profile_sys_id]^active=true
  fields: sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_risk?sysparm_query=profile=[profile_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk&sysparm_limit=20
```

### Step 3: Prioritize Issues by Risk and Compliance Impact

**Generate prioritized issue list with scoring:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var issues = [];
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.addQuery('state', 'IN', '1,2,3');
    gr.orderByDesc('risk_rating');
    gr.query();

    while (gr.next()) {
      var riskScore = 0;
      var controlGaps = 0;

      // Get associated risk score
      var risk = new GlideRecord('sn_grc_risk');
      risk.addQuery('profile', gr.profile.toString());
      risk.addQuery('active', true);
      risk.query();
      while (risk.next()) {
        var score = parseInt(risk.risk_score.toString()) || 0;
        if (score > riskScore) riskScore = score;
      }

      // Count failing controls
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('profile', gr.profile.toString());
      ctrl.addQuery('state', 'NOT IN', 'compliant,passed');
      ctrl.query();
      controlGaps = ctrl.getRowCount();

      var compositeScore = (riskScore * 0.6) + (controlGaps * 10 * 0.2) + (parseInt(gr.risk_rating) || 0) * 20 * 0.2;

      issues.push({
        number: gr.number.toString(),
        description: gr.short_description.toString(),
        risk_rating: gr.risk_rating.toString(),
        priority: gr.priority.toString(),
        max_risk_score: riskScore,
        control_gaps: controlGaps,
        composite_score: Math.round(compositeScore),
        profile: gr.profile.getDisplayValue(),
        due_date: gr.due_date.toString()
      });
    }

    issues.sort(function(a, b) { return b.composite_score - a.composite_score; });
    gs.info('PRIORITIZED GRC ISSUES:\n' + JSON.stringify(issues.slice(0, 20), null, 2));
  description: "GRC: Prioritize issues by composite risk and compliance score"
```

### Step 4: Generate Action Plan for an Issue

**Build a comprehensive remediation action plan:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var issueNumber = 'ISSUE0001234'; // Replace with target issue
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('number', issueNumber);
    gr.query();

    if (gr.next()) {
      var plan = {
        issue: {
          number: gr.number.toString(),
          description: gr.short_description.toString(),
          detail: gr.description.toString(),
          risk_rating: gr.risk_rating.toString(),
          priority: gr.priority.toString(),
          profile: gr.profile.getDisplayValue(),
          current_state: gr.state.getDisplayValue()
        },
        related_risks: [],
        affected_controls: [],
        remediation_steps: [],
        timeline: {},
        success_criteria: []
      };

      // Gather related risks
      var risk = new GlideRecord('sn_grc_risk');
      risk.addQuery('profile', gr.profile.toString());
      risk.addQuery('active', true);
      risk.query();
      while (risk.next()) {
        plan.related_risks.push({
          number: risk.number.toString(),
          description: risk.short_description.toString(),
          score: risk.risk_score.toString(),
          treatment: risk.treatment.getDisplayValue()
        });
      }

      // Gather affected controls
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('profile', gr.profile.toString());
      ctrl.query();
      while (ctrl.next()) {
        plan.affected_controls.push({
          number: ctrl.number.toString(),
          description: ctrl.short_description.toString(),
          state: ctrl.state.getDisplayValue(),
          owner: ctrl.owner.getDisplayValue()
        });
      }

      // Define timeline based on risk rating
      var riskRating = parseInt(gr.risk_rating) || 3;
      if (riskRating >= 4) {
        plan.timeline = { target_days: 30, review_frequency: 'Weekly', escalation: 'Immediate executive notification' };
      } else if (riskRating >= 3) {
        plan.timeline = { target_days: 60, review_frequency: 'Bi-weekly', escalation: 'Management review within 48 hours' };
      } else {
        plan.timeline = { target_days: 90, review_frequency: 'Monthly', escalation: 'Standard reporting cycle' };
      }

      // Define success criteria
      plan.success_criteria = [
        'All related controls return to compliant state',
        'Residual risk score reduced below organizational threshold',
        'Remediation evidence documented and reviewed',
        'Control owner sign-off obtained',
        'Post-remediation testing completed successfully'
      ];

      gs.info('ACTION PLAN:\n' + JSON.stringify(plan, null, 2));
    }
  description: "GRC: Generate comprehensive action plan for a specific issue"
```

### Step 5: Create Compliance Tasks for Remediation

**Create structured remediation tasks linked to the issue:**

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_compliance_task
  fields:
    short_description: "Remediate control gap identified in ISSUE0001234"
    description: "Implement corrective action for control failure. Review control design and operating effectiveness. Document remediation evidence."
    assigned_to: [responsible_user_sys_id]
    due_date: 2026-04-30
    priority: 2
    state: 1
    parent: [issue_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/sn_compliance_task
Content-Type: application/json

{
  "short_description": "Remediate control gap identified in ISSUE0001234",
  "description": "Implement corrective action for control failure.",
  "assigned_to": "[user_sys_id]",
  "due_date": "2026-04-30",
  "priority": "2",
  "state": "1"
}
```

### Step 6: Update Issue with Action Plan Reference

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_grc_issue
  sys_id: [issue_sys_id]
  fields:
    work_notes: |
      === ACTION PLAN GENERATED ===
      Composite Risk Score: 85/100
      Remediation Timeline: 30 days
      Review Frequency: Weekly
      Compliance Tasks Created: 3
      Responsible Party: [Control Owner Name]

      Success Criteria:
      1. All related controls return to compliant state
      2. Residual risk score reduced below threshold
      3. Evidence documented and reviewed
      4. Control owner sign-off obtained
    state: 2
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_grc_issue/[sys_id]
Content-Type: application/json

{
  "work_notes": "ACTION PLAN GENERATED - See compliance tasks for details",
  "state": "2"
}
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Issues | SN-Query-Table | GET /api/now/table/sn_grc_issue |
| Search Issues | SN-Natural-Language-Search | N/A |
| Analyze Risks | SN-Query-Table | GET /api/now/table/sn_grc_risk |
| Create Tasks | SN-Create-Record | POST /api/now/table/sn_compliance_task |
| Update Issue | SN-Update-Record | PATCH /api/now/table/sn_grc_issue |
| Complex Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Risk-Based Prioritization:** Always prioritize action plans based on composite risk scores, not just individual issue priority
- **SMART Criteria:** Define success criteria that are Specific, Measurable, Achievable, Relevant, and Time-bound
- **Ownership Clarity:** Every remediation step must have a single accountable owner, not a group
- **Evidence Requirements:** Specify what evidence must be collected to prove remediation is complete
- **Escalation Paths:** Define clear escalation procedures for overdue or stalled remediation
- **Periodic Review:** Schedule regular checkpoints to verify progress against the action plan timeline
- **Audit Trail:** Document all plan changes and decisions in work notes for audit readiness

## Troubleshooting

### No Issues Returned from Query

**Symptom:** Query returns empty results for active GRC issues
**Cause:** Issues may use custom states or the GRC plugin may not be fully activated
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_grc_issue
```
Verify the `state` field choices and adjust the query filter accordingly.

### Risk Rating Field Empty

**Symptom:** Issues lack risk_rating values needed for prioritization
**Cause:** Risk assessment has not been performed or risk_rating is a calculated field
**Solution:** Check if `risk_rating` is populated via a risk assessment workflow. Query the `sn_risk_definition` table to verify risk scoring configuration.

### Compliance Tasks Not Linking to Issue

**Symptom:** Created tasks do not appear under the parent issue
**Cause:** Incorrect parent field reference or relationship table required
**Solution:** Use `sn_grc_item` as an intermediary or check if a many-to-many relationship table exists between issues and tasks.

## Examples

### Example 1: Critical Compliance Gap Action Plan

**Scenario:** Audit finding reveals SOX-critical access control failure

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_grc_issue
  query: "critical SOX compliance issues with high risk rating that are open"
  limit: 10
```

**Generated Action Plan:**
- **Issue:** ISSUE0004521 - Segregation of duties violation in financial approvals
- **Risk Score:** 92/100
- **Timeline:** 15 business days (expedited)
- **Steps:**
  1. Immediately revoke conflicting role assignments (Day 1)
  2. Implement compensating controls for interim period (Days 1-3)
  3. Redesign approval workflow with proper separation (Days 3-10)
  4. Test new workflow with sample transactions (Days 10-12)
  5. Obtain internal audit sign-off (Days 12-15)
- **Success Criteria:** Zero conflicting roles, all test transactions pass, audit approval documented

### Example 2: Bulk Action Plan Generation

**Scenario:** Generate action plans for all high-priority issues after quarterly risk review

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.addQuery('priority', 'IN', '1,2');
    gr.addQuery('state', '1'); // New issues only
    gr.query();

    var planCount = 0;
    while (gr.next()) {
      var task = new GlideRecord('sn_compliance_task');
      task.initialize();
      task.short_description = 'Action Plan: ' + gr.short_description.toString();
      task.description = 'Remediation task for ' + gr.number.toString() + '. Review associated controls and implement corrective actions.';
      task.priority = gr.priority.toString();
      task.state = '1';

      var daysToAdd = (gr.priority == '1') ? 30 : 60;
      var dueDate = new GlideDateTime();
      dueDate.addDaysUTC(daysToAdd);
      task.due_date = dueDate;

      task.insert();
      planCount++;

      // Update issue state to In Progress
      gr.state = '2';
      gr.work_notes = 'Action plan generated. Compliance task created with ' + daysToAdd + '-day remediation window.';
      gr.update();
    }

    gs.info('Action plans generated for ' + planCount + ' issues');
  description: "GRC: Bulk generate action plans for high-priority issues"
```

## Related Skills

- `grc/issue-summarization` - Summarize GRC issues for executive reporting
- `grc/risk-assessment-summarization` - Understand risk context behind issues
- `grc/control-objective-management` - Manage the controls linked to issues
- `grc/regulatory-alert-analysis` - Identify regulatory drivers for issues
- `security/audit-compliance` - Audit trail analysis for GRC investigations

## References

- [ServiceNow GRC Issue Management](https://docs.servicenow.com/bundle/utah-governance-risk-compliance/page/product/grc-issue/concept/grc-issue-management.html)
- [COSO Internal Control Framework](https://www.coso.org/guidance-on-ic)
- [ISO 31000 Risk Management](https://www.iso.org/iso-31000-risk-management.html)
