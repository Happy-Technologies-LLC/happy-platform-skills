---
name: suggest-remediation-tasks
version: 1.0.0
description: Suggest remediation tasks for GRC issues based on control gaps, risk type, and regulatory framework. Generate task lists with owners and deadlines
author: Happy Technologies LLC
tags: [grc, remediation, tasks, compliance, risk-mitigation, control-gaps, regulatory]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Create-Record
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_remediation_task
    - /api/now/table/sn_compliance_policy
    - /api/now/table/sn_compliance_citation
    - /api/now/table/sys_user_group
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# GRC Suggest Remediation Tasks

## Overview

This skill analyzes GRC issues and their associated control gaps, risk profiles, and regulatory frameworks to generate targeted remediation task recommendations. It produces actionable task lists complete with suggested owners, deadlines, and priority rankings.

Key capabilities:
- **Gap Analysis:** Identify control deficiencies driving the issue and map each to a remediation action
- **Risk-Based Prioritization:** Rank suggested tasks by residual risk score, exploit likelihood, and business impact
- **Regulatory Alignment:** Map tasks to specific regulatory requirements (SOX, GDPR, HIPAA, PCI-DSS, NIST)
- **Owner Assignment:** Suggest task owners based on control ownership, assignment group, and historical resolution patterns
- **Deadline Calculation:** Propose due dates based on issue priority, regulatory timelines, and organizational SLAs
- **Task Template Generation:** Produce ready-to-create task records with all required fields populated

**When to use:**
- After a new GRC issue is identified and needs a remediation plan
- When audit findings require structured corrective action plans
- During periodic risk reviews to address open control gaps
- When regulatory changes require updated remediation approaches
- To standardize remediation planning across the organization

## Prerequisites

- **Roles:** `sn_grc.manager`, `sn_compliance.manager`, or `admin`
- **Plugins:** `com.sn_grc`, `com.sn_compliance`, `com.sn_risk`
- **Access:** Read access to `sn_grc_issue`, `sn_grc_risk`, `sn_compliance_control`, `sn_grc_profile`; write access to `sn_grc_remediation_task`
- **Knowledge:** Familiarity with regulatory frameworks applicable to your organization and control ownership structures

## Key GRC Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_grc_issue` | GRC issues and findings | number, short_description, state, priority, risk_rating, profile, item, category, source |
| `sn_grc_risk` | Risk records linked to profiles | number, risk_score, state, treatment, residual_risk, inherent_risk, category |
| `sn_compliance_control` | Compliance controls | number, state, control_objective, owner, effectiveness, test_result, test_date |
| `sn_grc_remediation_task` | Remediation tasks for issues | number, state, assigned_to, due_date, short_description, issue, priority |
| `sn_compliance_citation` | Regulatory citations | number, reference, regulation, authority |
| `sn_compliance_policy` | Compliance policies | number, short_description, state, owner, policy_statement |

## Procedure

### Step 1: Retrieve the Target GRC Issue

Fetch the issue that needs remediation planning, including all context fields.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_grc_issue
  sys_id: [ISSUE_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,remediation_plan,sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_issue?sysparm_query=number=[ISSUE_NUMBER]&sysparm_fields=sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,remediation_plan&sysparm_limit=1&sysparm_display_value=all
```

### Step 2: Analyze Control Gaps Linked to the Issue

Identify which controls are failing or deficient to determine what needs remediation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control
  query: profile=[issue_profile_sys_id]^stateNOT INcompliant,passed^active=true
  fields: sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result,test_date,remediation_owner
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_compliance_control?sysparm_query=profile=[profile_sys_id]^stateNOT INcompliant,passed^active=true&sysparm_fields=sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result,test_date&sysparm_limit=50&sysparm_display_value=all
```

### Step 3: Assess Risk Context for Prioritization

Pull associated risk records to understand severity and treatment strategy.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: profile=[issue_profile_sys_id]^active=true
  fields: sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category,owner
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_risk?sysparm_query=profile=[profile_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category,owner&sysparm_limit=25&sysparm_display_value=all
```

### Step 4: Identify Applicable Regulatory Requirements

Retrieve citations and policies to align remediation tasks with regulatory obligations.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_citation
  query: active=true
  fields: sys_id,number,short_description,reference,regulation,authority
  limit: 50
```

### Step 5: Generate Remediation Task Recommendations

Produce a structured set of remediation tasks based on the analysis.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var issueNumber = 'ISSUE0001234'; // Replace with target issue
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('number', issueNumber);
    gr.query();

    if (!gr.next()) { gs.info('Issue not found'); return; }

    var profileId = gr.profile.toString();
    var issuePriority = parseInt(gr.priority.toString()) || 3;
    var issueDue = gr.due_date.toString();
    var tasks = [];

    // Analyze failing controls and generate tasks
    var ctrl = new GlideRecord('sn_compliance_control');
    ctrl.addQuery('profile', profileId);
    ctrl.addQuery('active', true);
    ctrl.addQuery('state', 'NOT IN', 'compliant,passed');
    ctrl.query();

    while (ctrl.next()) {
      var controlState = ctrl.state.getDisplayValue();
      var effectiveness = ctrl.effectiveness.getDisplayValue();
      var taskPriority = issuePriority;

      // Escalate priority for ineffective or failed controls
      if (controlState == 'Failed' || effectiveness == 'Ineffective') {
        taskPriority = Math.max(1, issuePriority - 1);
      }

      // Calculate due date based on priority
      var dueDate = new GlideDateTime();
      if (taskPriority == 1) dueDate.addDaysUTC(7);
      else if (taskPriority == 2) dueDate.addDaysUTC(14);
      else if (taskPriority == 3) dueDate.addDaysUTC(30);
      else dueDate.addDaysUTC(60);

      // Cap at issue due date if earlier
      if (issueDue && new GlideDateTime(issueDue).compareTo(dueDate) < 0) {
        dueDate = new GlideDateTime(issueDue);
      }

      var owner = ctrl.owner.getDisplayValue() || gr.assigned_to.getDisplayValue() || 'Unassigned';

      // Task 1: Remediate the control gap
      tasks.push({
        short_description: 'Remediate control gap: ' + ctrl.short_description.toString(),
        description: 'Address ' + controlState + ' control ' + ctrl.number.toString() +
          '. Control objective: ' + ctrl.control_objective.toString() +
          '. Last test result: ' + ctrl.test_result.getDisplayValue(),
        priority: taskPriority,
        suggested_owner: owner,
        due_date: dueDate.toString(),
        control_reference: ctrl.number.toString(),
        task_type: 'control_remediation'
      });

      // Task 2: Retest the control after remediation
      var retestDate = new GlideDateTime(dueDate.toString());
      retestDate.addDaysUTC(14);
      tasks.push({
        short_description: 'Retest control: ' + ctrl.number.toString(),
        description: 'Verify remediation effectiveness by retesting ' + ctrl.number.toString() +
          '. Document test evidence and update control state.',
        priority: taskPriority + 1 > 4 ? 4 : taskPriority + 1,
        suggested_owner: owner,
        due_date: retestDate.toString(),
        control_reference: ctrl.number.toString(),
        task_type: 'control_retest'
      });
    }

    // Analyze risks for additional mitigation tasks
    var risk = new GlideRecord('sn_grc_risk');
    risk.addQuery('profile', profileId);
    risk.addQuery('active', true);
    risk.addQuery('residual_risk', '>=', '50');
    risk.query();

    while (risk.next()) {
      var riskDue = new GlideDateTime();
      riskDue.addDaysUTC(issuePriority <= 2 ? 14 : 30);

      tasks.push({
        short_description: 'Implement risk mitigation: ' + risk.short_description.toString(),
        description: 'Reduce residual risk for ' + risk.number.toString() +
          '. Current residual risk: ' + risk.residual_risk.toString() +
          '. Treatment strategy: ' + risk.treatment.getDisplayValue(),
        priority: issuePriority,
        suggested_owner: risk.owner.getDisplayValue() || 'Unassigned',
        due_date: riskDue.toString(),
        risk_reference: risk.number.toString(),
        task_type: 'risk_mitigation'
      });
    }

    // Summary
    var summary = {
      issue: issueNumber,
      total_tasks_suggested: tasks.length,
      by_type: {
        control_remediation: tasks.filter(function(t) { return t.task_type == 'control_remediation'; }).length,
        control_retest: tasks.filter(function(t) { return t.task_type == 'control_retest'; }).length,
        risk_mitigation: tasks.filter(function(t) { return t.task_type == 'risk_mitigation'; }).length
      },
      tasks: tasks
    };

    gs.info('SUGGESTED REMEDIATION TASKS:\n' + JSON.stringify(summary, null, 2));
  description: "GRC: Generate remediation task suggestions for a specific issue"
```

### Step 6: Create Approved Remediation Tasks

After review, create the approved tasks in ServiceNow.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_grc_remediation_task
  fields:
    short_description: "Remediate control gap: Inadequate access review process"
    description: "Address Failed control CTRL0001892..."
    priority: 2
    assigned_to: [owner_sys_id]
    due_date: "2026-04-15"
    issue: [issue_sys_id]
    state: open
```

**Using REST API:**
```bash
POST /api/now/table/sn_grc_remediation_task
Content-Type: application/json
{
  "short_description": "Remediate control gap: Inadequate access review process",
  "description": "Address Failed control CTRL0001892...",
  "priority": "2",
  "assigned_to": "[owner_sys_id]",
  "due_date": "2026-04-15",
  "issue": "[issue_sys_id]",
  "state": "open"
}
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Read Issue | SN-Read-Record | GET /api/now/table/sn_grc_issue/{sys_id} |
| Query Controls | SN-Query-Table | GET /api/now/table/sn_compliance_control |
| Query Risks | SN-Query-Table | GET /api/now/table/sn_grc_risk |
| Generate Suggestions | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Create Tasks | SN-Create-Record | POST /api/now/table/sn_grc_remediation_task |
| Discover Schema | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Review Before Creating:** Always present suggested tasks for human review before creating them in ServiceNow
- **Align to Frameworks:** Map each task to the specific regulatory requirement or control objective it addresses
- **Set Realistic Deadlines:** Account for organizational capacity and approval workflows when calculating due dates
- **Assign Clear Owners:** Prefer control owners as task owners; escalate to group leads when ownership is unclear
- **Include Evidence Requirements:** Specify what evidence (screenshots, logs, attestations) must be attached upon completion
- **Batch Related Tasks:** Group tasks under a single remediation plan for coordinated tracking
- **Track Effectiveness:** After task completion, verify the issue risk rating has improved accordingly

## Troubleshooting

### Remediation Task Table Not Found

**Symptom:** `sn_grc_remediation_task` returns errors or empty results
**Cause:** The table name may vary by ServiceNow version or may use a custom extended task table
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_grc_issue
```
Look for reference fields pointing to task-type tables. Check `sn_grc_task` or query `sys_db_object` for tables containing "remediation" in the label.

### Control Owner Field Empty

**Symptom:** Suggested tasks have no owner because control owners are not populated
**Cause:** Control ownership may be managed at the control objective level rather than individual controls
**Solution:** Query `sn_compliance_control_objective` and use the `owner` field from the parent control objective.

### Due Dates Exceed Regulatory Windows

**Symptom:** Calculated due dates exceed regulatory response requirements
**Cause:** The default deadline logic may not account for framework-specific timelines (e.g., PCI-DSS 90-day remediation window)
**Solution:** Add regulatory-specific deadline overrides in the script. Query `sn_compliance_citation` to retrieve applicable timeframes.

## Examples

### Example 1: SOX Compliance Issue Remediation

**Scenario:** Issue ISSUE0003456 identifies a segregation of duties violation in financial reporting

1. Retrieve issue: Priority 1 (Critical), risk rating High, due in 30 days
2. Identify 2 failing controls: CTRL0002100 (access review), CTRL0002101 (approval workflow)
3. Pull risk context: Residual risk score of 82 on linked financial reporting risk
4. Generate 5 tasks:
   - Implement role separation in ERP system (P1, 7 days, IT Security Lead)
   - Update access review procedure (P1, 14 days, Compliance Manager)
   - Configure compensating approval workflow (P2, 14 days, IT Operations)
   - Retest CTRL0002100 after remediation (P2, 28 days, Internal Audit)
   - Retest CTRL0002101 after remediation (P2, 28 days, Internal Audit)

### Example 2: Data Privacy Gap Remediation

**Scenario:** Issue ISSUE0004789 flags missing data retention controls per GDPR Article 17

1. Retrieve issue: Priority 2 (High), linked to data privacy profile
2. Identify 3 failing controls: data classification, retention scheduling, deletion verification
3. Generate 6 tasks with 90-day regulatory window alignment
4. Each task includes GDPR article reference and required evidence documentation
5. Tasks assigned to Data Protection Officer and IT Data Management team

## Related Skills

- `grc/issue-validator` - Validate issues before generating remediation tasks
- `grc/issue-summarization` - Summarize issues requiring remediation
- `grc/issue-action-plan` - Generate broader action plans beyond individual tasks
- `grc/control-objective-management` - Manage the controls that tasks remediate
- `grc/risk-assessment-summarization` - Assess risk context for prioritization
