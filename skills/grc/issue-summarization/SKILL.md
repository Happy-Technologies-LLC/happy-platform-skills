---
name: issue-summarization
version: 1.0.0
description: Summarize GRC issues with context including related risks, controls, compliance gaps, and business impact to generate executive-ready summaries for audit committees
author: Happy Technologies LLC
tags: [grc, issue, summarization, compliance, risk, audit, executive-reporting]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_compliance_policy
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_item
    - /api/now/table/sn_compliance_citation
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# GRC Issue Summarization

## Overview

This skill generates contextual summaries of Governance, Risk, and Compliance (GRC) issues in ServiceNow. It covers:

- Aggregating GRC issue data with related risks, controls, and compliance gaps
- Assessing business impact by correlating issues to profiles and policy violations
- Generating executive-ready summaries suitable for audit committees and board reporting
- Producing trend analysis showing issue volume, aging, and resolution rates
- Creating compliance gap narratives tied to regulatory citations

**When to use:**
- Preparing executive briefings or audit committee reports
- When stakeholders need a consolidated view of GRC posture
- During quarterly or annual compliance reviews
- When summarizing findings from internal or external audits
- Before risk committee meetings requiring issue status overviews

## Prerequisites

- **Roles:** `sn_grc.viewer`, `sn_grc.manager`, `sn_compliance.manager`, or `admin`
- **Plugins:** `com.sn_grc`, `com.sn_compliance`, `com.sn_risk`
- **Access:** Read access to sn_grc_issue, sn_grc_risk, sn_compliance_control, sn_grc_profile tables
- **Knowledge:** Understanding of organizational compliance frameworks and reporting requirements

## Key GRC Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_grc_issue` | GRC issues and findings | number, short_description, state, priority, risk_rating, profile, item, category, source |
| `sn_grc_risk` | Risk records linked to profiles | number, short_description, risk_score, state, treatment, residual_risk, inherent_risk |
| `sn_compliance_control` | Compliance controls | number, short_description, state, control_objective, owner, effectiveness, test_result |
| `sn_compliance_policy` | Compliance policies | number, short_description, state, owner, policy_statement, effective_date |
| `sn_grc_profile` | GRC entity profiles | number, short_description, profile_type, applies_to |
| `sn_compliance_citation` | Regulatory citations | number, short_description, reference, regulation, authority |

## Procedure

### Step 1: Retrieve GRC Issues for Summarization

Query GRC issues filtered by scope (all open, specific category, or date range).

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_issue
  query: active=true^ORDERBYDESCpriority
  fields: sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,sys_created_on,sys_updated_on,closed_at
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_issue?sysparm_query=active=true^ORDERBYDESCpriority&sysparm_fields=sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source&sysparm_limit=100
```

### Step 2: Gather Related Risk Context

For each issue, pull associated risk records to understand the risk landscape.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: profile=[issue_profile_sys_id]^active=true
  fields: sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category,owner
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_risk?sysparm_query=profile=[profile_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category&sysparm_limit=50
```

### Step 3: Identify Compliance Gaps and Control Failures

Query controls in non-compliant states linked to issue profiles.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control
  query: profile=[issue_profile_sys_id]^stateNOT INcompliant,passed^active=true
  fields: sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result,test_date
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_compliance_control?sysparm_query=profile=[profile_sys_id]^stateNOT INcompliant,passed^active=true&sysparm_fields=sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result&sysparm_limit=50
```

### Step 4: Generate Executive Summary with Aggregated Metrics

**Build a comprehensive summary with statistics and trends:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var summary = {
      generated_date: new GlideDateTime().toString(),
      issue_overview: { total_open: 0, critical: 0, high: 0, medium: 0, low: 0, overdue: 0 },
      by_category: {},
      by_source: {},
      risk_context: { avg_risk_score: 0, max_risk_score: 0, total_risks: 0 },
      compliance_gaps: { failing_controls: 0, untested_controls: 0 },
      aging: { under_30_days: 0, days_30_to_60: 0, days_60_to_90: 0, over_90_days: 0 },
      resolution_rate: { closed_last_30: 0, opened_last_30: 0 }
    };

    var now = new GlideDateTime();
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('active', true);
    gr.query();

    var riskScores = [];
    while (gr.next()) {
      summary.issue_overview.total_open++;

      // Priority distribution
      var pri = gr.priority.toString();
      if (pri == '1') summary.issue_overview.critical++;
      else if (pri == '2') summary.issue_overview.high++;
      else if (pri == '3') summary.issue_overview.medium++;
      else summary.issue_overview.low++;

      // Overdue check
      if (gr.due_date.toString() && new GlideDateTime(gr.due_date.toString()).compareTo(now) < 0) {
        summary.issue_overview.overdue++;
      }

      // Category breakdown
      var cat = gr.category.getDisplayValue() || 'Uncategorized';
      summary.by_category[cat] = (summary.by_category[cat] || 0) + 1;

      // Source breakdown
      var src = gr.source.getDisplayValue() || 'Manual';
      summary.by_source[src] = (summary.by_source[src] || 0) + 1;

      // Aging analysis
      var created = new GlideDateTime(gr.sys_created_on.toString());
      var ageDays = gs.dateDiff(created.toString(), now.toString(), true);
      if (ageDays < 30) summary.aging.under_30_days++;
      else if (ageDays < 60) summary.aging.days_30_to_60++;
      else if (ageDays < 90) summary.aging.days_60_to_90++;
      else summary.aging.over_90_days++;

      // Collect risk scores from related risks
      var risk = new GlideRecord('sn_grc_risk');
      risk.addQuery('profile', gr.profile.toString());
      risk.addQuery('active', true);
      risk.query();
      while (risk.next()) {
        var score = parseInt(risk.risk_score.toString()) || 0;
        riskScores.push(score);
        summary.risk_context.total_risks++;
        if (score > summary.risk_context.max_risk_score) summary.risk_context.max_risk_score = score;
      }
    }

    // Average risk score
    if (riskScores.length > 0) {
      var total = 0;
      for (var i = 0; i < riskScores.length; i++) total += riskScores[i];
      summary.risk_context.avg_risk_score = Math.round(total / riskScores.length);
    }

    // Compliance gap count
    var ctrl = new GlideAggregate('sn_compliance_control');
    ctrl.addQuery('active', true);
    ctrl.addQuery('state', 'NOT IN', 'compliant,passed');
    ctrl.addAggregate('COUNT');
    ctrl.query();
    if (ctrl.next()) summary.compliance_gaps.failing_controls = parseInt(ctrl.getAggregate('COUNT'));

    // Resolution rate (last 30 days)
    var closed = new GlideAggregate('sn_grc_issue');
    closed.addQuery('closed_at', '>=', gs.daysAgo(30));
    closed.addAggregate('COUNT');
    closed.query();
    if (closed.next()) summary.resolution_rate.closed_last_30 = parseInt(closed.getAggregate('COUNT'));

    var opened = new GlideAggregate('sn_grc_issue');
    opened.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    opened.addAggregate('COUNT');
    opened.query();
    if (opened.next()) summary.resolution_rate.opened_last_30 = parseInt(opened.getAggregate('COUNT'));

    gs.info('EXECUTIVE GRC ISSUE SUMMARY:\n' + JSON.stringify(summary, null, 2));
  description: "GRC: Generate executive summary of open issues with metrics"
```

### Step 5: Generate Individual Issue Detail Summary

**Produce a deep-dive summary for a specific issue:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var issueNumber = 'ISSUE0001234'; // Replace with target issue
    var gr = new GlideRecord('sn_grc_issue');
    gr.addQuery('number', issueNumber);
    gr.query();

    if (gr.next()) {
      var detail = {
        issue: {
          number: gr.number.toString(),
          title: gr.short_description.toString(),
          description: gr.description.toString(),
          state: gr.state.getDisplayValue(),
          priority: gr.priority.getDisplayValue(),
          risk_rating: gr.risk_rating.toString(),
          category: gr.category.getDisplayValue(),
          source: gr.source.getDisplayValue(),
          assigned_to: gr.assigned_to.getDisplayValue(),
          profile: gr.profile.getDisplayValue(),
          created: gr.sys_created_on.toString(),
          due_date: gr.due_date.toString()
        },
        related_risks: [],
        affected_controls: [],
        policy_references: [],
        business_impact: ''
      };

      // Related risks
      var risk = new GlideRecord('sn_grc_risk');
      risk.addQuery('profile', gr.profile.toString());
      risk.addQuery('active', true);
      risk.query();
      while (risk.next()) {
        detail.related_risks.push({
          number: risk.number.toString(),
          title: risk.short_description.toString(),
          inherent_risk: risk.inherent_risk.toString(),
          residual_risk: risk.residual_risk.toString(),
          treatment: risk.treatment.getDisplayValue()
        });
      }

      // Affected controls
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('profile', gr.profile.toString());
      ctrl.query();
      while (ctrl.next()) {
        detail.affected_controls.push({
          number: ctrl.number.toString(),
          title: ctrl.short_description.toString(),
          state: ctrl.state.getDisplayValue(),
          effectiveness: ctrl.effectiveness.getDisplayValue(),
          owner: ctrl.owner.getDisplayValue()
        });
      }

      // Policy references via profile
      var policy = new GlideRecord('sn_compliance_policy');
      policy.addQuery('active', true);
      policy.query();
      while (policy.next()) {
        detail.policy_references.push({
          number: policy.number.toString(),
          title: policy.short_description.toString(),
          state: policy.state.getDisplayValue()
        });
      }

      // Determine business impact narrative
      var maxRisk = 0;
      for (var i = 0; i < detail.related_risks.length; i++) {
        var rs = parseInt(detail.related_risks[i].residual_risk) || 0;
        if (rs > maxRisk) maxRisk = rs;
      }
      var failingCtrls = detail.affected_controls.filter(function(c) {
        return c.state !== 'Compliant' && c.state !== 'Passed';
      }).length;

      if (maxRisk >= 80 || failingCtrls >= 3) {
        detail.business_impact = 'HIGH - Significant compliance exposure with elevated residual risk and multiple control failures';
      } else if (maxRisk >= 50 || failingCtrls >= 1) {
        detail.business_impact = 'MEDIUM - Moderate compliance concern requiring timely remediation';
      } else {
        detail.business_impact = 'LOW - Minor finding with limited business impact';
      }

      gs.info('ISSUE DETAIL SUMMARY:\n' + JSON.stringify(detail, null, 2));
    }
  description: "GRC: Generate detailed summary for a specific issue"
```

### Step 6: Generate Audit Committee Narrative

**Using Natural Language Search to find issues by theme:**
```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_grc_issue
  query: "high priority compliance issues related to data privacy or access controls opened in the last quarter"
  limit: 25
```

**Produce a formatted narrative:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var narrative = [];
    narrative.push('=== GRC ISSUE SUMMARY FOR AUDIT COMMITTEE ===');
    narrative.push('Report Date: ' + new GlideDateTime().getDisplayValue());
    narrative.push('');

    // Open issue statistics
    var agg = new GlideAggregate('sn_grc_issue');
    agg.addQuery('active', true);
    agg.addAggregate('COUNT');
    agg.groupBy('priority');
    agg.query();

    narrative.push('OPEN ISSUES BY PRIORITY:');
    while (agg.next()) {
      narrative.push('  Priority ' + agg.priority.getDisplayValue() + ': ' + agg.getAggregate('COUNT') + ' issues');
    }
    narrative.push('');

    // Overdue issues
    var overdue = new GlideAggregate('sn_grc_issue');
    overdue.addQuery('active', true);
    overdue.addQuery('due_date', '<', new GlideDateTime().toString());
    overdue.addAggregate('COUNT');
    overdue.query();
    if (overdue.next()) {
      narrative.push('OVERDUE ISSUES: ' + overdue.getAggregate('COUNT'));
    }
    narrative.push('');

    // Top 5 critical issues
    narrative.push('TOP CRITICAL ISSUES:');
    var top = new GlideRecord('sn_grc_issue');
    top.addQuery('active', true);
    top.addQuery('priority', 'IN', '1,2');
    top.orderByDesc('risk_rating');
    top.setLimit(5);
    top.query();
    var idx = 1;
    while (top.next()) {
      narrative.push('  ' + idx + '. ' + top.number + ' - ' + top.short_description);
      narrative.push('     Risk Rating: ' + top.risk_rating + ' | Due: ' + top.due_date.getDisplayValue());
      idx++;
    }

    gs.info(narrative.join('\n'));
  description: "GRC: Generate audit committee narrative report"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Issues | SN-Query-Table | GET /api/now/table/sn_grc_issue |
| Search Issues | SN-Natural-Language-Search | N/A |
| Query Risks | SN-Query-Table | GET /api/now/table/sn_grc_risk |
| Query Controls | SN-Query-Table | GET /api/now/table/sn_compliance_control |
| Aggregate Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Audience Awareness:** Tailor summary depth to the audience -- executives need high-level metrics, compliance teams need control-level detail
- **Trend Context:** Always include trend data (month-over-month, quarter-over-quarter) to show trajectory
- **Risk Correlation:** Link issues to their underlying risks to show root cause patterns
- **Aging Visibility:** Highlight overdue issues and aging buckets prominently in executive summaries
- **Regulatory Mapping:** Map issues to specific regulatory requirements or citations when available
- **Actionable Language:** Summaries should include recommended next steps, not just status descriptions
- **Data Freshness:** Include the report generation timestamp and data currency disclaimer

## Troubleshooting

### Empty Risk Context for Issues

**Symptom:** Issues return no related risks when queried by profile
**Cause:** Issues may not be linked to a GRC profile, or the profile relationship uses a different field
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_grc_issue
```
Check for alternative relationship fields such as `item`, `content`, or custom reference fields linking to risk records.

### Category Field Returns Empty

**Symptom:** Issue category breakdowns show all items as "Uncategorized"
**Cause:** The `category` field may not be populated or may use a different field name
**Solution:** Query the `sys_choice` table for `sn_grc_issue` to verify available category values and check if a custom field like `issue_type` is used instead.

### Aggregate Queries Timeout

**Symptom:** Background scripts with GlideAggregate timeout on large datasets
**Cause:** Large volume of issue records without proper indexing
**Solution:** Add date range filters to limit the dataset, or use `setLimit()` on detail queries within aggregation loops.

## Examples

### Example 1: Monthly Compliance Posture Summary

**Scenario:** Compliance manager needs a monthly overview for the risk committee

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_grc_issue
  query: "all open GRC issues with high or critical priority created or updated this month"
  limit: 50
```

**Generated Summary:**
- **Total Open Issues:** 47 (up from 42 last month)
- **Critical/High:** 12 issues requiring immediate attention
- **Overdue:** 8 issues past their due date (17% overdue rate)
- **Top Category:** Access Control (15 issues, 32%)
- **Average Risk Score:** 67/100 across related risk records
- **Control Failures:** 9 controls in non-compliant state
- **Recommendation:** Escalate 3 overdue critical issues to executive sponsor; schedule control re-testing for Q2

### Example 2: Single Issue Deep-Dive for Audit

**Scenario:** External auditor requests detailed context on a specific finding

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_issue
  query: number=ISSUE0002341
  fields: sys_id,number,short_description,description,state,priority,risk_rating,profile,item,assigned_to,due_date,category,source,work_notes,sys_created_on
  limit: 1
```

**Generated Detail:**
- **Issue:** ISSUE0002341 - Inadequate encryption for data at rest
- **Source:** External Audit Finding
- **Risk Rating:** 4 (Critical)
- **Related Risks:** 2 risks with average residual score of 75
- **Affected Controls:** CTRL0001892 (Failed), CTRL0001893 (Not Tested)
- **Policy Reference:** POL0000145 - Data Protection Policy
- **Business Impact:** HIGH - Regulatory exposure under GDPR Article 32; potential fine up to 4% annual revenue
- **Days Open:** 45 (15 days past due date)

## Related Skills

- `grc/issue-action-plan` - Generate remediation action plans for summarized issues
- `grc/risk-assessment-summarization` - Deeper risk analysis behind issues
- `grc/control-objective-management` - Manage controls linked to issues
- `grc/regulatory-alert-analysis` - Identify regulatory drivers for issues
- `security/audit-compliance` - Audit trail and compliance reporting

## References

- [ServiceNow GRC Issue Management](https://docs.servicenow.com/bundle/utah-governance-risk-compliance/page/product/grc-issue/concept/grc-issue-management.html)
- [COSO ERM Framework](https://www.coso.org/guidance-on-erm)
- [IIA Global Internal Audit Standards](https://www.theiia.org/en/standards/)
