---
name: risk-event-summarization
version: 1.0.0
description: Summarize risk events with impact assessment, affected controls, contributing factors, and recommended mitigation actions
author: Happy Technologies LLC
tags: [grc, risk, event, summarization, impact-assessment, mitigation, controls]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Execute-Background-Script
    - SN-Natural-Language-Search
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sn_risk_event
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_compliance_control
    - /api/now/table/sn_grc_issue
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_risk_definition
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# GRC Risk Event Summarization

## Overview

This skill generates comprehensive summaries of risk events in ServiceNow GRC, providing stakeholders with a complete picture of what happened, why it happened, what was affected, and what should be done in response.

Key capabilities:
- **Event Context:** Aggregate risk event details including timeline, category, and triggering conditions
- **Impact Assessment:** Quantify financial, operational, reputational, and regulatory impact of risk events
- **Control Analysis:** Identify which controls failed, were bypassed, or were absent when the event occurred
- **Contributing Factor Analysis:** Determine root causes and contributing factors leading to the event
- **Mitigation Recommendations:** Generate prioritized mitigation actions based on event severity and control gaps
- **Trend Detection:** Identify patterns across related risk events to surface systemic issues

**When to use:**
- After a risk event materializes and stakeholders need a structured briefing
- During risk committee meetings requiring event summaries
- When building a risk event register or loss event database
- For regulatory reporting on operational risk events
- When conducting post-event reviews or lessons-learned sessions

## Prerequisites

- **Roles:** `sn_grc.manager`, `sn_risk.manager`, or `admin`
- **Plugins:** `com.sn_grc`, `com.sn_risk`, `com.sn_compliance`
- **Access:** Read access to `sn_risk_event`, `sn_grc_risk`, `sn_compliance_control`, `sn_grc_issue`, `sn_grc_profile`
- **Knowledge:** Understanding of organizational risk taxonomy and event categorization standards

## Key GRC Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_risk_event` | Risk events / loss events | number, short_description, state, category, event_date, impact, likelihood, financial_impact, risk, profile |
| `sn_grc_risk` | Associated risk records | number, risk_score, residual_risk, inherent_risk, treatment, state, category |
| `sn_compliance_control` | Controls that should have mitigated the event | number, state, effectiveness, test_result, control_objective, owner |
| `sn_grc_issue` | Issues generated from events | number, state, priority, risk_rating, source |
| `sn_risk_definition` | Risk definitions and categories | number, short_description, risk_type, category |
| `sn_grc_profile` | Entity profiles | number, profile_type, applies_to |

## Procedure

### Step 1: Retrieve Risk Event Details

Fetch the target risk event with full context fields.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_risk_event
  sys_id: [EVENT_SYS_ID]
  fields: sys_id,number,short_description,description,state,category,subcategory,event_date,discovered_date,impact,likelihood,financial_impact,operational_impact,reputational_impact,regulatory_impact,risk,profile,assigned_to,assignment_group,root_cause,contributing_factors,sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sn_risk_event?sysparm_query=number=[EVENT_NUMBER]&sysparm_fields=sys_id,number,short_description,description,state,category,subcategory,event_date,discovered_date,impact,likelihood,financial_impact,operational_impact,reputational_impact,regulatory_impact,risk,profile,assigned_to,root_cause,contributing_factors&sysparm_limit=1&sysparm_display_value=all
```

### Step 2: Gather Associated Risk Context

Pull the risk record linked to the event to understand the broader risk landscape.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: sys_id=[event_risk_sys_id]
  fields: sys_id,number,short_description,risk_score,state,treatment,residual_risk,inherent_risk,category,owner,risk_appetite,risk_tolerance
  limit: 1
```

For all risks under the same profile:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: profile=[event_profile_sys_id]^active=true
  fields: sys_id,number,short_description,risk_score,residual_risk,inherent_risk,treatment,category
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/sn_grc_risk?sysparm_query=profile=[profile_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,risk_score,residual_risk,inherent_risk,treatment,category&sysparm_limit=25&sysparm_display_value=all
```

### Step 3: Identify Affected Controls

Query controls linked to the risk profile to determine which should have prevented the event.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_compliance_control
  query: profile=[event_profile_sys_id]^active=true
  fields: sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result,test_date
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_compliance_control?sysparm_query=profile=[profile_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,state,control_objective,owner,effectiveness,test_result,test_date&sysparm_limit=50&sysparm_display_value=all
```

### Step 4: Retrieve Work Notes and Investigation History

Pull investigation notes to capture analyst findings and contributing factor analysis.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=sn_risk_event^element_id=[EVENT_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=name=sn_risk_event^element_id=[event_sys_id]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=25
```

### Step 5: Check for Related Issues and Historical Events

Identify GRC issues spawned from the event and similar past events.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_issue
  query: source_record=[EVENT_SYS_ID]^ORprofile=[event_profile_sys_id]
  fields: sys_id,number,short_description,state,priority,risk_rating,source,sys_created_on
  limit: 20
```

For historical pattern analysis:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_risk_event
  query: category=[event_category]^sys_id!=[EVENT_SYS_ID]^event_date>=javascript:gs.daysAgo(365)^ORDERBYDESCevent_date
  fields: sys_id,number,short_description,category,event_date,financial_impact,state
  limit: 25
```

### Step 6: Generate Comprehensive Risk Event Summary

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var eventNumber = 'RE0001234'; // Replace with target event
    var gr = new GlideRecord('sn_risk_event');
    gr.addQuery('number', eventNumber);
    gr.query();

    if (!gr.next()) { gs.info('Event not found'); return; }

    var summary = {
      event: {
        number: gr.number.toString(),
        title: gr.short_description.toString(),
        description: gr.description.toString(),
        state: gr.state.getDisplayValue(),
        category: gr.category.getDisplayValue(),
        event_date: gr.event_date.getDisplayValue(),
        discovered_date: gr.discovered_date.getDisplayValue(),
        detection_lag_days: 0
      },
      impact_assessment: {
        overall_impact: gr.impact.getDisplayValue(),
        financial: gr.financial_impact.toString() || 'Not quantified',
        operational: gr.operational_impact.getDisplayValue() || 'Not assessed',
        reputational: gr.reputational_impact.getDisplayValue() || 'Not assessed',
        regulatory: gr.regulatory_impact.getDisplayValue() || 'Not assessed'
      },
      affected_controls: [],
      contributing_factors: [],
      related_issues: [],
      historical_pattern: { similar_events_12mo: 0, total_financial_loss: 0 },
      mitigation_recommendations: []
    };

    // Detection lag
    if (gr.event_date.toString() && gr.discovered_date.toString()) {
      var evtDate = new GlideDateTime(gr.event_date.toString());
      var discDate = new GlideDateTime(gr.discovered_date.toString());
      summary.event.detection_lag_days = parseInt(gs.dateDiff(evtDate.toString(), discDate.toString(), true)) || 0;
    }

    // Contributing factors from record
    if (gr.root_cause.toString()) summary.contributing_factors.push('Root Cause: ' + gr.root_cause.toString());
    if (gr.contributing_factors.toString()) summary.contributing_factors.push('Factors: ' + gr.contributing_factors.toString());

    var profileId = gr.profile.toString();

    // Affected controls
    var ctrl = new GlideRecord('sn_compliance_control');
    ctrl.addQuery('profile', profileId);
    ctrl.addQuery('active', true);
    ctrl.query();
    while (ctrl.next()) {
      var ctrlStatus = ctrl.state.getDisplayValue();
      var wasEffective = (ctrlStatus == 'Compliant' || ctrlStatus == 'Passed');
      summary.affected_controls.push({
        control: ctrl.number.toString(),
        title: ctrl.short_description.toString(),
        state: ctrlStatus,
        effectiveness: ctrl.effectiveness.getDisplayValue(),
        prevented_event: wasEffective,
        owner: ctrl.owner.getDisplayValue()
      });
      if (!wasEffective) {
        summary.contributing_factors.push('Control failure: ' + ctrl.number.toString() + ' (' + ctrlStatus + ')');
      }
    }

    // Related issues
    var issue = new GlideRecord('sn_grc_issue');
    issue.addQuery('profile', profileId);
    issue.addQuery('active', true);
    issue.query();
    while (issue.next()) {
      summary.related_issues.push({
        number: issue.number.toString(),
        title: issue.short_description.toString(),
        priority: issue.priority.getDisplayValue(),
        state: issue.state.getDisplayValue()
      });
    }

    // Historical pattern
    var hist = new GlideRecord('sn_risk_event');
    hist.addQuery('category', gr.category.toString());
    hist.addQuery('sys_id', '!=', gr.sys_id.toString());
    hist.addQuery('event_date', '>=', gs.daysAgo(365));
    hist.query();
    while (hist.next()) {
      summary.historical_pattern.similar_events_12mo++;
      summary.historical_pattern.total_financial_loss += parseFloat(hist.financial_impact.toString()) || 0;
    }

    // Generate mitigation recommendations
    var failedControls = summary.affected_controls.filter(function(c) { return !c.prevented_event; });
    if (failedControls.length > 0) {
      summary.mitigation_recommendations.push('IMMEDIATE: Remediate ' + failedControls.length + ' failed controls identified during event analysis');
    }
    if (summary.event.detection_lag_days > 7) {
      summary.mitigation_recommendations.push('SHORT-TERM: Improve detection capabilities - ' + summary.event.detection_lag_days + ' day detection lag exceeds acceptable threshold');
    }
    if (summary.historical_pattern.similar_events_12mo >= 3) {
      summary.mitigation_recommendations.push('STRATEGIC: Investigate systemic root cause - ' + summary.historical_pattern.similar_events_12mo + ' similar events in past 12 months indicates pattern');
    }
    summary.mitigation_recommendations.push('ONGOING: Update risk assessment to reflect materialized event and adjust residual risk scores');

    gs.info('RISK EVENT SUMMARY:\n' + JSON.stringify(summary, null, 2));
  description: "GRC: Generate comprehensive risk event summary with impact assessment"
```

### Step 7: Generate Executive Narrative

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var narrative = [];
    narrative.push('=== RISK EVENT EXECUTIVE SUMMARY ===');
    narrative.push('');

    var agg = new GlideAggregate('sn_risk_event');
    agg.addQuery('event_date', '>=', gs.daysAgo(90));
    agg.addAggregate('COUNT');
    agg.groupBy('category');
    agg.query();

    narrative.push('RISK EVENTS - LAST 90 DAYS BY CATEGORY:');
    while (agg.next()) {
      narrative.push('  ' + agg.category.getDisplayValue() + ': ' + agg.getAggregate('COUNT') + ' events');
    }
    narrative.push('');

    // Top events by financial impact
    narrative.push('TOP EVENTS BY FINANCIAL IMPACT:');
    var top = new GlideRecord('sn_risk_event');
    top.addQuery('event_date', '>=', gs.daysAgo(90));
    top.addNotNullQuery('financial_impact');
    top.orderByDesc('financial_impact');
    top.setLimit(5);
    top.query();
    var idx = 1;
    while (top.next()) {
      narrative.push('  ' + idx + '. ' + top.number + ' - ' + top.short_description);
      narrative.push('     Financial Impact: $' + top.financial_impact + ' | Category: ' + top.category.getDisplayValue());
      idx++;
    }

    gs.info(narrative.join('\n'));
  description: "GRC: Generate quarterly risk event narrative for leadership"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Read Event | SN-Read-Record | GET /api/now/table/sn_risk_event/{sys_id} |
| Query Events | SN-Query-Table | GET /api/now/table/sn_risk_event |
| Query Controls | SN-Query-Table | GET /api/now/table/sn_compliance_control |
| Query Risks | SN-Query-Table | GET /api/now/table/sn_grc_risk |
| Aggregate Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Search Events | SN-Natural-Language-Search | N/A |

## Best Practices

- **Timeliness:** Generate summaries within 24 hours of event discovery while details are fresh
- **Quantify Impact:** Always attempt to quantify financial impact, even as an estimate with confidence range
- **Root Cause Depth:** Distinguish between immediate causes and systemic contributing factors
- **Control Mapping:** Explicitly identify which controls should have prevented or detected the event
- **Historical Context:** Include trend data to distinguish one-off events from systemic patterns
- **Actionable Recommendations:** Every summary should end with specific, assignable mitigation actions
- **Regulatory Awareness:** Flag events that may trigger regulatory notification requirements

## Troubleshooting

### Risk Event Table Not Found

**Symptom:** `sn_risk_event` returns no results or table not found
**Cause:** The risk event table name may differ across ServiceNow versions; some use `sn_risk_event` while others use `sn_grc_loss_event`
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_risk_event
```
If not found, search for tables containing "risk_event" or "loss_event" in `sys_db_object`.

### Financial Impact Field Empty

**Symptom:** Financial impact data is consistently null despite events having known costs
**Cause:** Financial impact may be tracked in a related loss record rather than on the event itself
**Solution:** Check for related tables like `sn_risk_loss` or custom financial impact assessment records linked via reference fields.

### No Controls Linked to Event Profile

**Symptom:** Control analysis returns empty results for the event profile
**Cause:** The event may not be linked to a GRC profile, or controls use a different relationship path
**Solution:** Check the `item` field on the event instead of `profile`, or query `sn_grc_m2m_item_profile` for the relationship mapping.

## Examples

### Example 1: Operational Risk Event Summary

**Scenario:** System outage event RE0002345 affecting payment processing

- **Event:** Unplanned outage of payment gateway, 4-hour duration
- **Detection Lag:** 15 minutes (automated monitoring alert)
- **Financial Impact:** $180,000 in lost transaction revenue
- **Failed Controls:** 2 -- disaster recovery test (not tested in 14 months), capacity monitoring threshold (set too high)
- **Contributing Factors:** Infrastructure change without proper testing, single point of failure in payment routing
- **Similar Events (12 months):** 2 prior events totaling $95,000
- **Recommendations:** Update DR testing schedule, lower capacity thresholds, implement redundant payment routing

### Example 2: Compliance Risk Event Summary

**Scenario:** Data breach event RE0003001 involving customer PII exposure

- **Event:** Unauthorized access to customer database via compromised service account
- **Detection Lag:** 12 days (flagged by external security researcher)
- **Records Affected:** 15,000 customer records
- **Regulatory Impact:** GDPR Article 33 notification required within 72 hours
- **Failed Controls:** 3 -- privileged access review, service account rotation, database activity monitoring
- **Recommendations:** Immediate credential rotation, deploy database activity monitoring, establish 72-hour notification procedure

## Related Skills

- `grc/issue-summarization` - Summarize GRC issues generated from risk events
- `grc/risk-assessment-summarization` - Broader risk assessment context
- `grc/suggest-remediation-tasks` - Generate remediation tasks for event-related control gaps
- `grc/regulatory-alert-analysis` - Identify regulatory implications of risk events
- `grc/control-objective-management` - Manage controls affected by events
