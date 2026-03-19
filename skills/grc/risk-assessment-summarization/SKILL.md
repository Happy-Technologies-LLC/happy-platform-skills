---
name: risk-assessment-summarization
version: 1.0.0
description: Summarize risk assessments with scoring, trends, heat map data, and mitigation recommendations covering inherent vs residual risk analysis
author: Happy Technologies LLC
tags: [grc, risk, assessment, summarization, heat-map, mitigation, inherent-risk, residual-risk]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_risk_definition
    - /api/now/table/sn_risk_event
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_grc_item
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Risk Assessment Summarization

## Overview

This skill produces comprehensive summaries of risk assessments in ServiceNow GRC, including:

- Aggregating risk scores across profiles, categories, and business units
- Comparing inherent risk versus residual risk to measure control effectiveness
- Generating heat map data (likelihood x impact matrices) for visual reporting
- Identifying risk trends over time (increasing, stable, decreasing)
- Recommending mitigation strategies based on treatment plans and residual exposure
- Linking risk assessments to underlying risk events and control effectiveness

**When to use:**
- Preparing risk committee or board-level risk reports
- After completing a risk assessment cycle and needing consolidated results
- When comparing risk posture across business units or time periods
- During strategic planning to understand enterprise risk exposure
- When evaluating effectiveness of risk mitigation investments

## Prerequisites

- **Roles:** `sn_risk.manager`, `sn_grc.manager`, or `admin`
- **Plugins:** `com.sn_risk`, `com.sn_grc`
- **Access:** Read access to sn_grc_risk, sn_risk_definition, sn_risk_event, sn_grc_profile tables
- **Knowledge:** Understanding of risk scoring methodology (likelihood x impact) and organizational risk appetite

## Key Risk Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_grc_risk` | Risk register records | number, short_description, risk_score, inherent_risk, residual_risk, state, treatment, likelihood, impact, profile, category, owner |
| `sn_risk_definition` | Risk framework definitions | number, short_description, risk_criteria, scoring_method, appetite |
| `sn_risk_event` | Actual risk events/incidents | number, short_description, event_date, impact_amount, risk, category |
| `sn_grc_profile` | Entity profiles for risk scoping | number, short_description, profile_type, applies_to |
| `sn_grc_item` | GRC content items | number, short_description, item_type, profile |

## Procedure

### Step 1: Retrieve Active Risk Records

Query all active risks with scoring data.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: active=true^ORDERBYDESCrisk_score
  fields: sys_id,number,short_description,risk_score,inherent_risk,residual_risk,state,treatment,likelihood,impact,profile,category,owner,sys_created_on,sys_updated_on
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_risk?sysparm_query=active=true^ORDERBYDESCrisk_score&sysparm_fields=sys_id,number,short_description,risk_score,inherent_risk,residual_risk,state,treatment,likelihood,impact,profile,category,owner&sysparm_limit=100
```

### Step 2: Retrieve Risk Framework Definitions

Understand the scoring methodology and risk appetite thresholds.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_risk_definition
  query: active=true
  fields: sys_id,number,short_description,risk_criteria,scoring_method,appetite,description
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_risk_definition?sysparm_query=active=true&sysparm_fields=sys_id,number,short_description,risk_criteria,scoring_method,appetite,description&sysparm_limit=20
```

### Step 3: Generate Risk Assessment Summary with Inherent vs Residual Analysis

**Produce aggregated risk metrics and control effectiveness:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var summary = {
      generated_date: new GlideDateTime().toString(),
      total_risks: 0,
      by_treatment: {},
      by_category: {},
      inherent_vs_residual: {
        avg_inherent: 0,
        avg_residual: 0,
        control_effectiveness_pct: 0,
        risks_above_appetite: 0
      },
      severity_distribution: { critical: 0, high: 0, medium: 0, low: 0 },
      top_risks: []
    };

    var inherentSum = 0, residualSum = 0, count = 0;
    var riskAppetite = 50; // Default; adjust per organization

    var gr = new GlideRecord('sn_grc_risk');
    gr.addQuery('active', true);
    gr.orderByDesc('risk_score');
    gr.query();

    while (gr.next()) {
      summary.total_risks++;
      count++;

      var inherent = parseInt(gr.inherent_risk.toString()) || 0;
      var residual = parseInt(gr.residual_risk.toString()) || 0;
      var score = parseInt(gr.risk_score.toString()) || 0;

      inherentSum += inherent;
      residualSum += residual;

      if (residual > riskAppetite) summary.inherent_vs_residual.risks_above_appetite++;

      // Severity distribution
      if (score >= 80) summary.severity_distribution.critical++;
      else if (score >= 60) summary.severity_distribution.high++;
      else if (score >= 30) summary.severity_distribution.medium++;
      else summary.severity_distribution.low++;

      // Treatment breakdown
      var treat = gr.treatment.getDisplayValue() || 'Not Assigned';
      summary.by_treatment[treat] = (summary.by_treatment[treat] || 0) + 1;

      // Category breakdown
      var cat = gr.category.getDisplayValue() || 'Uncategorized';
      summary.by_category[cat] = (summary.by_category[cat] || 0) + 1;

      // Top 10 risks
      if (summary.top_risks.length < 10) {
        summary.top_risks.push({
          number: gr.number.toString(),
          title: gr.short_description.toString(),
          risk_score: score,
          inherent: inherent,
          residual: residual,
          treatment: gr.treatment.getDisplayValue(),
          owner: gr.owner.getDisplayValue()
        });
      }
    }

    if (count > 0) {
      summary.inherent_vs_residual.avg_inherent = Math.round(inherentSum / count);
      summary.inherent_vs_residual.avg_residual = Math.round(residualSum / count);
      if (inherentSum > 0) {
        summary.inherent_vs_residual.control_effectiveness_pct =
          Math.round(((inherentSum - residualSum) / inherentSum) * 100);
      }
    }

    gs.info('RISK ASSESSMENT SUMMARY:\n' + JSON.stringify(summary, null, 2));
  description: "GRC: Generate risk assessment summary with inherent vs residual analysis"
```

### Step 4: Generate Heat Map Data (Likelihood x Impact Matrix)

**Build a likelihood-impact matrix for heat map visualization:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Heat map: 5x5 matrix (likelihood x impact)
    var heatMap = {};
    for (var l = 1; l <= 5; l++) {
      for (var i = 1; i <= 5; i++) {
        heatMap[l + 'x' + i] = { likelihood: l, impact: i, count: 0, risks: [] };
      }
    }

    var gr = new GlideRecord('sn_grc_risk');
    gr.addQuery('active', true);
    gr.query();

    while (gr.next()) {
      var likelihood = parseInt(gr.likelihood.toString()) || 0;
      var impact = parseInt(gr.impact.toString()) || 0;

      // Normalize to 1-5 scale if needed
      if (likelihood > 5) likelihood = Math.ceil(likelihood / 20);
      if (impact > 5) impact = Math.ceil(impact / 20);
      if (likelihood < 1) likelihood = 1;
      if (impact < 1) impact = 1;

      var key = likelihood + 'x' + impact;
      if (heatMap[key]) {
        heatMap[key].count++;
        if (heatMap[key].risks.length < 3) {
          heatMap[key].risks.push(gr.number.toString() + ': ' + gr.short_description.toString());
        }
      }
    }

    // Format for output
    var matrix = [];
    for (var cell in heatMap) {
      if (heatMap[cell].count > 0) {
        matrix.push(heatMap[cell]);
      }
    }
    matrix.sort(function(a, b) { return (b.likelihood * b.impact) - (a.likelihood * a.impact); });

    gs.info('RISK HEAT MAP DATA:\n' + JSON.stringify(matrix, null, 2));
    gs.info('\nHEAT MAP LEGEND:');
    gs.info('  Critical (Red): Likelihood >= 4 AND Impact >= 4');
    gs.info('  High (Orange): Score >= 12');
    gs.info('  Medium (Yellow): Score >= 6');
    gs.info('  Low (Green): Score < 6');
  description: "GRC: Generate risk heat map data (likelihood x impact matrix)"
```

### Step 5: Analyze Risk Trends Over Time

**Compare current risk posture to historical baseline:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var periods = [
      { label: 'Current', days: 0 },
      { label: '30 Days Ago', days: 30 },
      { label: '60 Days Ago', days: 60 },
      { label: '90 Days Ago', days: 90 }
    ];

    var trends = [];
    for (var p = 0; p < periods.length; p++) {
      var period = periods[p];
      var totalScore = 0, count = 0, critical = 0;

      if (period.days === 0) {
        var gr = new GlideRecord('sn_grc_risk');
        gr.addQuery('active', true);
        gr.query();
        while (gr.next()) {
          var s = parseInt(gr.risk_score.toString()) || 0;
          totalScore += s;
          count++;
          if (s >= 80) critical++;
        }
      } else {
        // Use risk events as proxy for historical risk levels
        var ev = new GlideAggregate('sn_risk_event');
        ev.addQuery('sys_created_on', '>=', gs.daysAgo(period.days));
        ev.addQuery('sys_created_on', '<', gs.daysAgo(period.days - 30));
        ev.addAggregate('COUNT');
        ev.query();
        if (ev.next()) count = parseInt(ev.getAggregate('COUNT'));
      }

      trends.push({
        period: period.label,
        total_risks: count,
        avg_score: count > 0 ? Math.round(totalScore / count) : 0,
        critical_risks: critical
      });
    }

    gs.info('RISK TREND ANALYSIS:\n' + JSON.stringify(trends, null, 2));
  description: "GRC: Analyze risk score trends over time"
```

### Step 6: Generate Mitigation Recommendations

**Produce actionable recommendations based on risk treatment and residual exposure:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var recommendations = [];

    var gr = new GlideRecord('sn_grc_risk');
    gr.addQuery('active', true);
    gr.addQuery('residual_risk', '>', 50);
    gr.orderByDesc('residual_risk');
    gr.setLimit(20);
    gr.query();

    while (gr.next()) {
      var inherent = parseInt(gr.inherent_risk.toString()) || 0;
      var residual = parseInt(gr.residual_risk.toString()) || 0;
      var reduction = inherent > 0 ? Math.round(((inherent - residual) / inherent) * 100) : 0;
      var treatment = gr.treatment.getDisplayValue() || 'Not Assigned';

      var rec = {
        risk_number: gr.number.toString(),
        title: gr.short_description.toString(),
        inherent_risk: inherent,
        residual_risk: residual,
        risk_reduction_pct: reduction,
        current_treatment: treatment,
        recommendations: []
      };

      // Generate recommendations based on treatment and residual level
      if (treatment === 'Accept' && residual >= 70) {
        rec.recommendations.push('Re-evaluate acceptance decision; residual risk exceeds organizational appetite');
        rec.recommendations.push('Conduct cost-benefit analysis for additional controls');
      }
      if (treatment === 'Mitigate' && reduction < 30) {
        rec.recommendations.push('Current controls are insufficient; risk reduction is only ' + reduction + '%');
        rec.recommendations.push('Evaluate additional compensating controls or alternative mitigation strategies');
      }
      if (treatment === 'Transfer' && residual >= 60) {
        rec.recommendations.push('Verify insurance coverage adequacy for residual exposure');
        rec.recommendations.push('Review third-party SLAs and liability clauses');
      }
      if (treatment === 'Not Assigned') {
        rec.recommendations.push('URGENT: Assign risk treatment strategy immediately');
        rec.recommendations.push('Schedule risk owner meeting to determine treatment approach');
      }
      if (residual >= 80) {
        rec.recommendations.push('CRITICAL: Escalate to executive leadership for immediate action');
      }

      // Check for related control failures
      var ctrl = new GlideRecord('sn_compliance_control');
      ctrl.addQuery('profile', gr.profile.toString());
      ctrl.addQuery('state', 'NOT IN', 'compliant,passed');
      ctrl.query();
      if (ctrl.getRowCount() > 0) {
        rec.recommendations.push('Address ' + ctrl.getRowCount() + ' failing controls linked to this risk profile');
      }

      recommendations.push(rec);
    }

    gs.info('MITIGATION RECOMMENDATIONS:\n' + JSON.stringify(recommendations, null, 2));
  description: "GRC: Generate mitigation recommendations for high-residual risks"
```

### Step 7: Query Risk Events for Loss Data Context

**Retrieve actual risk events to ground the assessment in real incidents:**

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_risk_event
  query: sys_created_on>=javascript:gs.daysAgo(365)^ORDERBYDESCimpact_amount
  fields: sys_id,number,short_description,event_date,impact_amount,risk,category,state
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_risk_event?sysparm_query=sys_created_on>=javascript:gs.daysAgo(365)^ORDERBYDESCimpact_amount&sysparm_fields=sys_id,number,short_description,event_date,impact_amount,risk,category,state&sysparm_limit=50
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Risks | SN-Query-Table | GET /api/now/table/sn_grc_risk |
| Query Risk Definitions | SN-Query-Table | GET /api/now/table/sn_risk_definition |
| Query Risk Events | SN-Query-Table | GET /api/now/table/sn_risk_event |
| Search Risks | SN-Natural-Language-Search | N/A |
| Complex Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Inherent vs Residual:** Always present both inherent and residual risk to demonstrate control value
- **Risk Appetite Context:** Frame all scores against the organization's defined risk appetite thresholds
- **Heat Map Clarity:** Use standardized 5x5 matrices with consistent color coding across reports
- **Trend Baselines:** Establish quarterly baselines for meaningful trend comparison
- **Treatment Validation:** Verify that risk treatment strategies are actively implemented, not just documented
- **Loss Data Integration:** Incorporate actual risk event data to validate assessment accuracy
- **Owner Accountability:** Include risk owner names in all summaries for clear accountability

## Troubleshooting

### Risk Scores Show as Zero

**Symptom:** All risk_score, inherent_risk, or residual_risk fields return 0 or empty
**Cause:** Risk scoring may use calculated fields populated by assessment workflows, or custom scoring fields
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_grc_risk
```
Check for alternative scoring fields like `calculated_risk`, `risk_score_calculated`, or `assessment_score`. Also verify that risk assessments have been completed.

### Likelihood and Impact Not Populated

**Symptom:** Heat map generation fails due to empty likelihood/impact values
**Cause:** Risk records may use qualitative ratings (High/Medium/Low) instead of numeric scores
**Solution:** Map qualitative values to numeric scale: Critical=5, High=4, Medium=3, Low=2, Very Low=1. Check the `sys_choice` table for field value definitions.

### Risk Events Table Empty

**Symptom:** No records returned from sn_risk_event
**Cause:** The Risk Events module may not be configured, or events are tracked in a custom table
**Solution:** Check if `com.sn_risk_advanced` plugin is activated. Some organizations track loss events in custom tables or external systems.

## Examples

### Example 1: Quarterly Enterprise Risk Summary

**Scenario:** CRO needs a consolidated risk posture report for the board

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_grc_risk
  query: "all active risks with high or critical risk scores grouped by category"
  limit: 50
```

**Generated Summary:**
- **Total Active Risks:** 156
- **Risk Distribution:** Critical: 12 | High: 34 | Medium: 72 | Low: 38
- **Average Inherent Risk:** 62/100 | Average Residual Risk:** 38/100
- **Control Effectiveness:** 39% average risk reduction through controls
- **Above Appetite:** 18 risks exceed organizational risk appetite (threshold: 50)
- **Top Category:** Information Security (42 risks, 27%)
- **Trend:** Risk count increased 8% from last quarter; average residual decreased 4%
- **Key Recommendation:** 5 risks with "Accept" treatment exceed appetite -- re-evaluate acceptance decisions

### Example 2: Heat Map Report for Risk Committee

**Scenario:** Risk committee requests a visual risk landscape

**Heat Map Output (top-right = highest concern):**
```
Impact →    1     2     3     4     5
Likelihood
    5      [ 0]  [ 2]  [ 5]  [ 8]  [ 3]  ← Highest concern row
    4      [ 1]  [ 4]  [12]  [15]  [ 6]
    3      [ 3]  [ 8]  [18]  [10]  [ 4]
    2      [ 5]  [12]  [ 9]  [ 6]  [ 2]
    1      [ 8]  [ 7]  [ 5]  [ 2]  [ 1]
```
- **Red Zone (L>=4, I>=4):** 32 risks requiring immediate executive attention
- **Amber Zone (Score>=12):** 47 risks under active mitigation
- **Green Zone (Score<6):** 21 risks within acceptable tolerance

## Related Skills

- `grc/issue-action-plan` - Create action plans for risks that have materialized as issues
- `grc/issue-summarization` - Summarize issues arising from risk assessments
- `grc/control-objective-management` - Manage controls that mitigate assessed risks
- `grc/regulatory-alert-analysis` - Assess regulatory changes impacting risk landscape
- `security/audit-compliance` - Audit controls supporting risk mitigation

## References

- [ServiceNow Risk Management](https://docs.servicenow.com/bundle/utah-governance-risk-compliance/page/product/risk-management/concept/risk-management.html)
- [ISO 31000:2018 Risk Management](https://www.iso.org/iso-31000-risk-management.html)
- [COSO ERM Framework](https://www.coso.org/guidance-on-erm)
- [NIST SP 800-30 Risk Assessment Guide](https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final)
