---
name: issue-validator
version: 1.0.0
description: Validate GRC issues for completeness, accuracy, and compliance. Check required fields, risk ratings, control mappings, and remediation plan adequacy
author: Happy Technologies LLC
tags: [grc, issue, validation, compliance, data-quality, audit-readiness, controls]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_item
    - /api/now/table/sn_grc_remediation_task
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# GRC Issue Validator

## Overview

This skill validates GRC issues in ServiceNow for completeness, accuracy, and compliance readiness. It performs systematic checks across multiple dimensions to ensure issues meet organizational and regulatory standards before audit review.

Key validation capabilities:
- **Field Completeness:** Verify all mandatory fields are populated (short description, category, priority, risk rating, profile, owner)
- **Risk Rating Accuracy:** Cross-check risk ratings against linked risk scores and control test results
- **Control Mapping Integrity:** Ensure issues are properly mapped to relevant controls and control objectives
- **Remediation Plan Adequacy:** Validate that remediation tasks exist, have owners, deadlines, and measurable outcomes
- **Data Consistency:** Detect mismatches between issue severity and linked risk/control states
- **Audit Readiness:** Score issues on a readiness scale for internal or external audit presentation

**When to use:**
- Before audit committee reporting to ensure data quality
- During periodic GRC hygiene reviews
- When onboarding new issues from automated scans or assessments
- Before closing issues to verify all remediation evidence is captured
- As part of a quality gate in issue management workflows

## Prerequisites

- **Roles:** `sn_grc.manager`, `sn_compliance.manager`, or `admin`
- **Plugins:** `com.sn_grc`, `com.sn_compliance`, `com.sn_risk`
- **Access:** Read access to `sn_grc_issue`, `sn_grc_risk`, `sn_compliance_control`, `sn_grc_profile`, `sn_grc_remediation_task` tables
- **Knowledge:** Understanding of organizational issue management policies and required fields

## Key GRC Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_grc_issue` | GRC issues and findings | number, short_description, state, priority, risk_rating, profile, item, category, source, assigned_to, due_date |
| `sn_grc_risk` | Associated risk records | number, risk_score, state, treatment, residual_risk, inherent_risk |
| `sn_compliance_control` | Mapped controls | number, state, control_objective, effectiveness, test_result |
| `sn_grc_profile` | Entity profiles | number, profile_type, applies_to |
| `sn_grc_remediation_task` | Remediation tasks for issues | number, state, assigned_to, due_date, short_description, issue |

## Procedure

### Step 1: Retrieve Issues for Validation

Fetch target issues -- either a single issue or a batch for bulk validation.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_issue
  query: active=true^ORDERBYDESCsys_updated_on
  fields: sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,remediation_plan,sys_created_on,sys_updated_on,closed_at,close_notes
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_issue?sysparm_query=active=true^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,remediation_plan&sysparm_limit=50&sysparm_display_value=all
```

### Step 2: Validate Field Completeness

Run a comprehensive field completeness check across all target issues.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var requiredFields = [
      'short_description', 'description', 'priority', 'risk_rating',
      'profile', 'assigned_to', 'due_date', 'category', 'source'
    ];
    var results = { total_checked: 0, passed: 0, failed: 0, issues: [] };

    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.query();

    while (gr.next()) {
      results.total_checked++;
      var missing = [];

      for (var i = 0; i < requiredFields.length; i++) {
        var field = requiredFields[i];
        if (gr.getValue(field) === null || gr.getValue(field) === '') {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        results.failed++;
        results.issues.push({
          number: gr.number.toString(),
          title: gr.short_description.toString(),
          missing_fields: missing,
          completeness_pct: Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100)
        });
      } else {
        results.passed++;
      }
    }

    results.pass_rate = results.total_checked > 0
      ? Math.round((results.passed / results.total_checked) * 100) + '%'
      : 'N/A';

    gs.info('FIELD COMPLETENESS VALIDATION:\n' + JSON.stringify(results, null, 2));
  description: "GRC: Validate field completeness for all active issues"
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_issue?sysparm_query=active=true^short_descriptionISEMPTY^ORassigned_toISEMPTY^ORdue_dateISEMPTY^ORcategoryISEMPTY^ORprofileISEMPTY&sysparm_fields=sys_id,number,short_description,assigned_to,due_date,category,profile&sysparm_limit=100
```

### Step 3: Validate Risk Rating Consistency

Cross-check issue risk ratings against linked risk record scores to detect mismatches.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var mismatches = [];
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.addNotNullQuery('risk_rating');
    gr.addNotNullQuery('profile');
    gr.query();

    while (gr.next()) {
      var issueRating = parseInt(gr.risk_rating.toString()) || 0;
      var profileId = gr.profile.toString();

      var risk = new GlideAggregate('sn_grc_risk');
      risk.addQuery('profile', profileId);
      risk.addQuery('active', true);
      risk.addAggregate('MAX', 'residual_risk');
      risk.addAggregate('AVG', 'risk_score');
      risk.query();

      if (risk.next()) {
        var maxResidual = parseInt(risk.getAggregate('MAX', 'residual_risk')) || 0;
        var avgScore = parseInt(risk.getAggregate('AVG', 'risk_score')) || 0;

        // Flag if issue rating is significantly lower than risk data suggests
        if (issueRating <= 2 && maxResidual >= 70) {
          mismatches.push({
            issue: gr.number.toString(),
            issue_risk_rating: issueRating,
            max_residual_risk: maxResidual,
            avg_risk_score: avgScore,
            flag: 'Issue rated LOW but linked risks are HIGH'
          });
        } else if (issueRating >= 4 && maxResidual <= 30) {
          mismatches.push({
            issue: gr.number.toString(),
            issue_risk_rating: issueRating,
            max_residual_risk: maxResidual,
            avg_risk_score: avgScore,
            flag: 'Issue rated HIGH but linked risks are LOW'
          });
        }
      }
    }

    gs.info('RISK RATING CONSISTENCY:\nMismatches found: ' + mismatches.length + '\n' + JSON.stringify(mismatches, null, 2));
  description: "GRC: Cross-validate risk ratings against linked risk records"
```

### Step 4: Validate Control Mappings

Ensure each issue is mapped to at least one control and that mapped controls are in a valid state.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var controlIssues = { unmapped: [], stale_controls: [], orphaned: [] };

    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.query();

    while (gr.next()) {
      var profileId = gr.profile.toString();
      if (!profileId) {
        controlIssues.unmapped.push({
          issue: gr.number.toString(),
          problem: 'No profile linked - cannot verify control mapping'
        });
        continue;
      }

      var ctrl = new GlideAggregate('sn_compliance_control');
      ctrl.addQuery('profile', profileId);
      ctrl.addAggregate('COUNT');
      ctrl.query();

      var controlCount = 0;
      if (ctrl.next()) {
        controlCount = parseInt(ctrl.getAggregate('COUNT')) || 0;
      }

      if (controlCount === 0) {
        controlIssues.unmapped.push({
          issue: gr.number.toString(),
          profile: gr.profile.getDisplayValue(),
          problem: 'Profile has no linked controls'
        });
      }

      // Check for stale control test results (over 12 months old)
      var stale = new GlideRecord('sn_compliance_control');
      stale.addQuery('profile', profileId);
      stale.addQuery('test_date', '<', gs.daysAgo(365));
      stale.query();
      while (stale.next()) {
        controlIssues.stale_controls.push({
          issue: gr.number.toString(),
          control: stale.number.toString(),
          last_tested: stale.test_date.getDisplayValue()
        });
      }
    }

    gs.info('CONTROL MAPPING VALIDATION:\n' + JSON.stringify(controlIssues, null, 2));
  description: "GRC: Validate control mappings for active issues"
```

### Step 5: Validate Remediation Plan Adequacy

Check that each issue has at least one remediation task with an assigned owner and a due date.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var remediationGaps = [];

    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.addQuery('state', 'NOT IN', 'new,draft');
    gr.query();

    while (gr.next()) {
      var tasks = new GlideRecord('sn_grc_remediation_task');
      tasks.addQuery('issue', gr.sys_id.toString());
      tasks.query();

      var taskCount = 0;
      var tasksWithoutOwner = 0;
      var tasksWithoutDueDate = 0;
      var overdueTasks = 0;
      var now = new GlideDateTime();

      while (tasks.next()) {
        taskCount++;
        if (!tasks.assigned_to.toString()) tasksWithoutOwner++;
        if (!tasks.due_date.toString()) tasksWithoutDueDate++;
        if (tasks.due_date.toString() && new GlideDateTime(tasks.due_date.toString()).compareTo(now) < 0 && tasks.state.toString() != 'closed') {
          overdueTasks++;
        }
      }

      var gaps = [];
      if (taskCount === 0) gaps.push('No remediation tasks defined');
      if (tasksWithoutOwner > 0) gaps.push(tasksWithoutOwner + ' task(s) without owner');
      if (tasksWithoutDueDate > 0) gaps.push(tasksWithoutDueDate + ' task(s) without due date');
      if (overdueTasks > 0) gaps.push(overdueTasks + ' overdue task(s)');

      if (gaps.length > 0) {
        remediationGaps.push({
          issue: gr.number.toString(),
          priority: gr.priority.getDisplayValue(),
          task_count: taskCount,
          gaps: gaps
        });
      }
    }

    gs.info('REMEDIATION PLAN VALIDATION:\nIssues with gaps: ' + remediationGaps.length + '\n' + JSON.stringify(remediationGaps, null, 2));
  description: "GRC: Validate remediation plans for active issues"
```

### Step 6: Generate Comprehensive Validation Report

Compile all validation results into a single scored report.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var report = {
      generated: new GlideDateTime().toString(),
      summary: { total_issues: 0, fully_valid: 0, needs_attention: 0 },
      scores: [],
      recommendations: []
    };

    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.query();

    while (gr.next()) {
      report.summary.total_issues++;
      var score = 100;
      var deductions = [];

      // Field completeness (-10 per missing required field)
      var reqFields = ['short_description','description','priority','risk_rating','profile','assigned_to','due_date','category'];
      for (var i = 0; i < reqFields.length; i++) {
        if (!gr.getValue(reqFields[i])) {
          score -= 10;
          deductions.push('Missing: ' + reqFields[i]);
        }
      }

      // Due date validation (-15 if overdue)
      if (gr.due_date.toString() && new GlideDateTime(gr.due_date.toString()).compareTo(new GlideDateTime()) < 0) {
        score -= 15;
        deductions.push('Issue is overdue');
      }

      // Remediation check (-20 if no tasks)
      var taskGr = new GlideAggregate('sn_grc_remediation_task');
      taskGr.addQuery('issue', gr.sys_id.toString());
      taskGr.addAggregate('COUNT');
      taskGr.query();
      var taskCount = 0;
      if (taskGr.next()) taskCount = parseInt(taskGr.getAggregate('COUNT'));
      if (taskCount === 0) {
        score -= 20;
        deductions.push('No remediation tasks');
      }

      if (score < 0) score = 0;

      if (score >= 80) report.summary.fully_valid++;
      else report.summary.needs_attention++;

      if (score < 80) {
        report.scores.push({
          issue: gr.number.toString(),
          title: gr.short_description.toString(),
          validation_score: score,
          deductions: deductions
        });
      }
    }

    report.scores.sort(function(a, b) { return a.validation_score - b.validation_score; });

    gs.info('GRC ISSUE VALIDATION REPORT:\n' + JSON.stringify(report, null, 2));
  description: "GRC: Generate comprehensive validation report with scores"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Issues | SN-Query-Table | GET /api/now/table/sn_grc_issue |
| Read Single Issue | SN-Read-Record | GET /api/now/table/sn_grc_issue/{sys_id} |
| Run Validation Scripts | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Discover Schema | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |
| Query Controls | SN-Query-Table | GET /api/now/table/sn_compliance_control |

## Best Practices

- **Run Validations Periodically:** Schedule weekly or bi-weekly validation sweeps, not just before audits
- **Define Validation Rules Centrally:** Document required fields and thresholds in a shared compliance standard so validators use consistent criteria
- **Score and Prioritize:** Use validation scores to prioritize remediation of data quality issues -- fix critical gaps first
- **Automate Where Possible:** Convert repeating validation checks into business rules or scheduled jobs for continuous monitoring
- **Track Trends:** Monitor validation pass rates over time to measure data quality improvement
- **Validate Before State Transitions:** Enforce validation checks before issues move to "In Remediation" or "Closed" states
- **Include Context in Reports:** Always pair validation failures with actionable guidance on how to fix them

## Troubleshooting

### Remediation Task Table Not Found

**Symptom:** Queries to `sn_grc_remediation_task` return no results or table not found
**Cause:** The remediation task table name may differ across ServiceNow versions or custom configurations
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_grc_issue
```
Check for reference fields pointing to task tables. Alternative table names include `sn_grc_task`, `task`, or custom extended task tables.

### Risk Rating Field Uses Different Scale

**Symptom:** Risk rating consistency checks produce false positives
**Cause:** Some organizations use a 1-5 scale while others use 1-100 or Low/Medium/High labels
**Solution:** Query the `sys_choice` table for `sn_grc_issue.risk_rating` to identify the valid values and adjust validation thresholds accordingly.

### Profile-Based Queries Return No Linked Records

**Symptom:** Controls or risks not found when querying by profile sys_id
**Cause:** The relationship may use `item` instead of `profile`, or a many-to-many relationship table
**Solution:** Check `sn_grc_m2m_item_profile` or query by the `item` field on the issue instead of `profile`.

## Examples

### Example 1: Pre-Audit Bulk Validation

**Scenario:** Compliance manager needs to validate all open issues before an external audit

1. Query all 85 active GRC issues
2. Run field completeness check: 72 pass (85%), 13 fail
3. Run risk rating consistency: 4 mismatches flagged
4. Run control mapping check: 6 issues with no linked controls
5. Run remediation plan check: 11 issues missing remediation tasks
6. Generate scored report: 62 issues score 80+, 23 need attention
7. Top finding: 5 critical-priority issues have no assigned owner

### Example 2: Single Issue Validation Before Closure

**Scenario:** Issue owner wants to verify ISSUE0004521 is ready for closure

1. Read issue record with all fields
2. Field completeness: 100% -- all required fields populated
3. Risk rating: Rated "High" (4), linked risks show residual score of 72 -- consistent
4. Control mapping: 3 controls linked, all in "Compliant" state
5. Remediation: 2 tasks, both closed with completion evidence
6. Validation score: 95/100 (minor deduction: close notes could be more detailed)
7. Result: Issue approved for closure

## Related Skills

- `grc/issue-summarization` - Summarize validated issues for reporting
- `grc/issue-action-plan` - Generate action plans for issues failing validation
- `grc/suggest-remediation-tasks` - Create remediation tasks for issues missing them
- `grc/control-objective-management` - Manage controls linked to issues
- `grc/risk-assessment-summarization` - Deeper risk analysis for rating validation
