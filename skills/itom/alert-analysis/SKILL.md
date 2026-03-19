---
name: alert-analysis
version: 1.0.0
description: Analyze operational alerts including severity assessment, pattern recognition, noise reduction, alert correlation, grouping, suppression rules, and root cause indicators
author: Happy Technologies LLC
tags: [itom, alerts, event-management, correlation, noise-reduction, severity, operations]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/em_alert
    - /api/now/table/em_event
    - /api/now/table/em_alert_metric_correlation
    - /api/now/table/evt_mgmt_alert_actions
    - /api/now/table/em_impact
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Alert Analysis

## Overview

This skill provides a structured approach to analyzing operational alerts in ServiceNow ITOM Event Management. It covers:

- Querying and filtering active alerts by severity and state
- Identifying alert patterns and recurring noise
- Configuring alert grouping and correlation rules
- Building suppression rules to reduce alert fatigue
- Tracing root cause indicators through correlated alerts
- Assessing alert severity against CI business criticality

**When to use:** When the operations team needs to triage a flood of alerts, identify recurring noise, correlate related alerts, or tune event management rules.

**Plugin required:** `com.snc.event_management`

## Prerequisites

- **Roles:** `evt_mgmt_admin`, `evt_mgmt_user`, or `itil`
- **Access:** Read/write to `em_alert`, `em_event`, `evt_mgmt_alert_actions` tables
- **Knowledge:** Familiarity with ITOM Event Management concepts, alert lifecycle states, and CI relationships
- **Plugins:** `com.snc.event_management` must be activated

## Procedure

### Step 1: Query Active Alerts by Severity

Retrieve current open alerts to understand the operational landscape.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: state!=Closed^ORDERBYDESCseverity
  fields: sys_id,number,description,severity,state,source,node,ci,group_source,acknowledged,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/em_alert?sysparm_query=state!=Closed^ORDERBYDESCseverity&sysparm_fields=sys_id,number,description,severity,state,source,node,ci,group_source,acknowledged,sys_created_on&sysparm_limit=50
```

**Severity reference values:**
| Value | Label    | Description                        |
|-------|----------|------------------------------------|
| 1     | Critical | Immediate action required          |
| 2     | Major    | Significant degradation            |
| 3     | Minor    | Limited impact, monitor closely    |
| 4     | Warning  | Potential issue developing         |
| 5     | Info     | Informational, no action needed    |
| 0     | Clear    | Previously raised alert now clear  |

### Step 2: Identify Alert Patterns and Noise

Analyze alert frequency by source and node to detect noisy alert sources.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Identify top noisy alert sources in the last 24 hours
  script: |
    var ga = new GlideAggregate('em_alert');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(1));
    ga.addQuery('state', '!=', 'Closed');
    ga.addAggregate('COUNT');
    ga.groupBy('source');
    ga.groupBy('node');
    ga.orderByAggregate('COUNT', false);
    ga.setLimit(20);
    ga.query();

    gs.info('=== TOP NOISY ALERT SOURCES (Last 24h) ===');
    while (ga.next()) {
      var count = ga.getAggregate('COUNT');
      var source = ga.source.toString();
      var node = ga.node.toString();
      gs.info('Source: ' + source + ' | Node: ' + node + ' | Count: ' + count);
    }
```

**Using REST API:**
```bash
GET /api/now/stats/em_alert?sysparm_query=sys_created_on>=javascript:gs.daysAgo(1)^state!=Closed&sysparm_count=true&sysparm_group_by=source,node&sysparm_orderby=COUNT&sysparm_limit=20
```

### Step 3: Analyze Alert Correlation Groups

Review how alerts are being grouped together to detect related issues.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: group_source!=NULL^state=Open
  fields: sys_id,number,description,severity,group_source,ci,node,source
  limit: 30
```

To find all alerts in a specific correlation group:
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: group_source=[parent_alert_sys_id]
  fields: sys_id,number,description,severity,node,ci,source,sys_created_on
```

**Check alert metric correlations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert_metric_correlation
  query: alert=[alert_sys_id]
  fields: sys_id,alert,metric_name,ci,correlation_strength,sys_created_on
```

### Step 4: Review and Create Suppression Rules

Examine existing suppression rules and create new ones for identified noise.

**List existing alert action rules:**
```
Tool: SN-Query-Table
Parameters:
  table_name: evt_mgmt_alert_actions
  query: active=true
  fields: sys_id,name,description,type,order,active,filter_conditions
  limit: 50
```

**Using REST API to create a suppression rule:**
```bash
POST /api/now/table/evt_mgmt_alert_actions
Content-Type: application/json

{
  "name": "Suppress disk space warnings on dev servers",
  "type": "Suppress",
  "active": true,
  "order": 100,
  "filter_conditions": "source=Nagios^descriptionLIKEdisk space^nodeLIKEdev-",
  "description": "Suppress low-severity disk space warnings from development servers"
}
```

### Step 5: Assess Impact Through CI Relationships

Cross-reference alerts with CI business criticality and service impact.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Enrich critical alerts with CI business context
  script: |
    var gr = new GlideRecord('em_alert');
    gr.addQuery('state', 'Open');
    gr.addQuery('severity', '<=', 2);  // Critical and Major
    gr.query();

    gs.info('=== CRITICAL ALERT IMPACT ANALYSIS ===');
    while (gr.next()) {
      var alertNum = gr.number.toString();
      var ciId = gr.ci.toString();
      var severity = gr.severity.getDisplayValue();

      if (ciId) {
        var ci = new GlideRecord('cmdb_ci');
        if (ci.get(ciId)) {
          var criticality = ci.business_criticality.getDisplayValue() || 'Not Set';
          var supportGroup = ci.support_group.getDisplayValue() || 'Unassigned';

          // Check service associations
          var svcCount = 0;
          var svcAssoc = new GlideRecord('service_ci_assoc');
          svcAssoc.addQuery('ci_id', ciId);
          svcAssoc.query();
          svcCount = svcAssoc.getRowCount();

          gs.info(alertNum + ' | Severity: ' + severity +
            ' | CI: ' + ci.name + ' | Criticality: ' + criticality +
            ' | Support: ' + supportGroup + ' | Services Affected: ' + svcCount);
        }
      } else {
        gs.info(alertNum + ' | Severity: ' + severity + ' | CI: NOT MAPPED');
      }
    }
```

**Check em_impact for business service impact:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_impact
  query: alert=[alert_sys_id]
  fields: sys_id,alert,business_service,impact_level,ci
```

### Step 6: Acknowledge and Manage Alert State

Update alert states after analysis is complete.

**Acknowledge an alert:**
```
Tool: SN-Update-Record
Parameters:
  table_name: em_alert
  sys_id: [alert_sys_id]
  data:
    acknowledged: true
    work_notes: "Alert reviewed during operational analysis. Root cause traced to [description]. Monitoring."
```

**Close a resolved alert:**
```
Tool: SN-Update-Record
Parameters:
  table_name: em_alert
  sys_id: [alert_sys_id]
  data:
    state: Closed
    close_notes: "Root cause resolved. Disk space freed on node prod-web-03."
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query alerts, events, suppression rules |
| `SN-Get-Record` | Retrieve single alert detail |
| `SN-Update-Record` | Acknowledge, close, or update alerts |
| `SN-NL-Search` | Natural language alert search |
| `SN-Execute-Background-Script` | Aggregation, pattern analysis, CI enrichment |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/em_alert` | GET | Query alerts |
| `/api/now/table/em_alert/{sys_id}` | PATCH | Update alert state |
| `/api/now/table/em_event` | GET | Query raw events |
| `/api/now/table/evt_mgmt_alert_actions` | GET/POST | Manage suppression rules |
| `/api/now/table/em_alert_metric_correlation` | GET | Check metric correlations |
| `/api/now/table/em_impact` | GET | Check business impact |

## Best Practices

- **Triage by Severity First:** Always address Critical (1) and Major (2) alerts before moving to lower severities
- **Map Alerts to CIs:** Unmapped alerts lose business context; prioritize CI mapping in event rules
- **Review Noise Weekly:** Schedule weekly reviews of top alert sources to maintain suppression rules
- **Use Correlation Before Suppression:** Correlating related alerts preserves signal; suppressing hides it
- **Document Suppression Rationale:** Always record why a suppression rule was created for future audit
- **Validate Severity Alignment:** Ensure alert severity matches CI business criticality -- a Warning on a Tier-1 service may warrant escalation

## Troubleshooting

### Alerts Not Appearing in Console

**Cause:** Events are not being processed into alerts
**Solution:** Check `em_event` table for raw events. Verify event rules in `evt_mgmt_alert_actions` are mapping events to alerts correctly.

### Too Many Duplicate Alerts

**Cause:** Missing or misconfigured alert grouping rules
**Solution:** Review alert correlation rules. Ensure the `group_source` field logic matches on `source`, `node`, and `type` combinations.

### Suppression Rule Not Taking Effect

**Cause:** Rule order conflict or filter condition mismatch
**Solution:** Check the `order` field -- lower numbers execute first. Test filter conditions by querying `em_alert` with the same encoded query.

### CI Not Linked to Alert

**Cause:** Event payload missing `ci_identifier` or lookup rules not matching
**Solution:** Review the event payload for CI identification fields. Check CI lookup rules in Event Management settings.

## Examples

### Example 1: Triage a Critical Alert Spike

```
# 1. Find all Critical alerts from the last hour
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: severity=1^sys_created_on>=javascript:gs.hoursAgo(1)
  fields: sys_id,number,description,source,node,ci,state
  limit: 50

# 2. Group by source to identify if it is a single source flooding
Tool: SN-Execute-Background-Script
Parameters:
  description: Group critical alerts by source
  script: |
    var ga = new GlideAggregate('em_alert');
    ga.addQuery('severity', 1);
    ga.addQuery('sys_created_on', '>=', gs.hoursAgo(1));
    ga.addAggregate('COUNT');
    ga.groupBy('source');
    ga.query();
    while (ga.next()) {
      gs.info('Source: ' + ga.source + ' | Count: ' + ga.getAggregate('COUNT'));
    }

# 3. If single source, consider temporary suppression or investigation
```

### Example 2: Build a Noise Reduction Report

```
# 1. Aggregate alerts by source, type, and node over the last 7 days
Tool: SN-Execute-Background-Script
Parameters:
  description: Weekly noise report
  script: |
    var ga = new GlideAggregate('em_alert');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(7));
    ga.addAggregate('COUNT');
    ga.groupBy('source');
    ga.groupBy('description');
    ga.orderByAggregate('COUNT', false);
    ga.setLimit(15);
    ga.query();

    gs.info('=== WEEKLY NOISE REPORT ===');
    gs.info('Top 15 recurring alert types (last 7 days):');
    var rank = 1;
    while (ga.next()) {
      gs.info(rank + '. Source: ' + ga.source +
        ' | Description: ' + ga.description +
        ' | Count: ' + ga.getAggregate('COUNT'));
      rank++;
    }
```

### Example 3: Correlate Alerts for a Single CI

```
# 1. Find all alerts for a specific CI
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: ci=[ci_sys_id]^state!=Closed^ORDERBYDESCsys_created_on
  fields: sys_id,number,description,severity,state,source,sys_created_on
  limit: 20

# 2. Check metric correlations
Tool: SN-Query-Table
Parameters:
  table_name: em_alert_metric_correlation
  query: ci=[ci_sys_id]
  fields: alert,metric_name,correlation_strength
```

## Related Skills

- `itom/alert-investigation` - Deep-dive investigation of individual alerts
- `itom/service-mapping` - Understand service dependencies behind alerts
- `itom/health-log-analytics` - Anomaly detection and log-based alerting
- `itom/observability-integration` - Ingest alerts from external monitoring tools
- `cmdb/impact-analysis` - Assess business impact of alerting CIs

## References

- [ServiceNow Event Management](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/concept/c_EventManagement.html)
- [Alert Correlation](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/concept/alert-correlation.html)
- [Event Management Best Practices](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/reference/evt-mgmt-best-practices.html)
