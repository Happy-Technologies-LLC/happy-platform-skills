---
name: health-log-analytics
version: 1.0.0
description: Health log analytics for anomaly detection, capacity planning, performance trending, log source configuration, and threshold management in ServiceNow ITOM
author: Happy Technologies LLC
tags: [itom, health-log-analytics, anomaly-detection, capacity-planning, performance, metrics, thresholds, hla]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-NL-Search
  rest:
    - /api/now/table/em_alert
    - /api/now/table/sa_metric_definition
    - /api/now/table/sa_threshold
    - /api/now/table/sa_anomaly
    - /api/now/table/sa_log_source
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_ci_service
  native:
    - Bash
complexity: advanced
estimated_time: 25-45 minutes
---

# Health Log Analytics

## Overview

This skill provides a structured approach to managing Health Log Analytics (HLA) in ServiceNow ITOM. It covers:

- Configuring log sources for metric collection and log ingestion
- Defining and tuning metric thresholds for proactive alerting
- Detecting anomalies in CI performance patterns using ML-driven baselines
- Performing capacity planning analysis based on historical metric trends
- Building performance trending reports for infrastructure and services
- Managing threshold policies and alert suppression rules

**When to use:** When operations teams need to proactively monitor infrastructure health, detect performance degradation before it impacts services, plan for capacity needs, or tune alerting thresholds to reduce noise.

**Plugin required:** `com.snc.sa.health-log-analytics`

## Prerequisites

- **Roles:** `sa_admin`, `evt_mgmt_admin`, or `itil`
- **Access:** Read/write to `sa_metric_definition`, `sa_threshold`, `sa_anomaly`, `sa_log_source`, `em_alert`
- **Knowledge:** Familiarity with ITOM metric types, time-series data concepts, and CI performance baselines
- **Plugins:** `com.snc.sa.health-log-analytics` and `com.snc.em` must be activated
- **Data:** MID Server collecting metrics from monitored CIs, or observability platform connectors feeding metric data

## Procedure

### Step 1: Review Configured Log Sources

Inventory active log sources to understand current data collection scope.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_log_source
  query: active=true^ORDERBYname
  fields: sys_id,name,type,source_type,ci,status,last_collection_time,collection_interval,mid_server
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sa_log_source?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,type,source_type,ci,status,last_collection_time,collection_interval,mid_server&sysparm_display_value=true&sysparm_limit=50
```

**Log Source Types:**
| Type          | Description                                    |
|--------------|-----------------------------------------------|
| Agent        | ServiceNow agent collecting from host          |
| SNMP         | SNMP polling from network devices              |
| WMI          | Windows Management Instrumentation             |
| SSH          | Script-based collection over SSH               |
| REST         | Pull from external APIs                        |
| Syslog       | Push-based syslog receiver                     |

### Step 2: Review Metric Definitions

Examine which metrics are being tracked and their configurations.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_metric_definition
  query: active=true^ORDERBYci_type,name
  fields: sys_id,name,description,ci_type,metric_type,unit,source,aggregation_type,collection_interval
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sa_metric_definition?sysparm_query=active=true^ORDERBYci_type,name&sysparm_fields=sys_id,name,description,ci_type,metric_type,unit,source,aggregation_type,collection_interval&sysparm_display_value=true&sysparm_limit=50
```

**Common Metric Types:**
| Metric             | CI Type         | Unit    | Typical Threshold |
|-------------------|-----------------|---------|-------------------|
| CPU Utilization   | cmdb_ci_server  | Percent | Warning: 80%, Critical: 95% |
| Memory Usage      | cmdb_ci_server  | Percent | Warning: 85%, Critical: 95% |
| Disk Usage        | cmdb_ci_server  | Percent | Warning: 80%, Critical: 90% |
| Network Latency   | cmdb_ci_netgear | ms      | Warning: 100ms, Critical: 500ms |
| Response Time     | cmdb_ci_service | ms      | Warning: 2000ms, Critical: 5000ms |

### Step 3: Manage Thresholds

Review and configure metric thresholds for proactive alerting.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_threshold
  query: active=true^ORDERBYmetric_definition.name
  fields: sys_id,name,metric_definition,ci,ci_type,warning_value,critical_value,operator,duration,active
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sa_threshold?sysparm_query=active=true^ORDERBYmetric_definition.name&sysparm_fields=sys_id,name,metric_definition,ci,ci_type,warning_value,critical_value,operator,duration,active&sysparm_display_value=true&sysparm_limit=50
```

**Create a new threshold:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sa_threshold
  data:
    name: High CPU Alert - Production Servers
    metric_definition: [metric_def_sys_id]
    ci_type: cmdb_ci_server
    warning_value: 80
    critical_value: 95
    operator: ">="
    duration: 300
    active: true
```

### Step 4: Detect Anomalies

Query for detected anomalies to identify unexpected performance patterns.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_anomaly
  query: state=active^ORDERBYDESCdetection_time
  fields: sys_id,ci,metric_definition,severity,state,detection_time,expected_value,actual_value,deviation,description
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sa_anomaly?sysparm_query=state=active^ORDERBYDESCdetection_time&sysparm_fields=sys_id,ci,metric_definition,severity,state,detection_time,expected_value,actual_value,deviation,description&sysparm_display_value=true&sysparm_limit=30
```

### Step 5: Capacity Planning Analysis

Analyze historical metric trends to predict capacity needs.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze capacity trends for servers approaching resource limits
  script: |
    gs.info('=== CAPACITY PLANNING ANALYSIS ===');

    // Find CIs with recent high-utilization alerts
    var ga = new GlideAggregate('em_alert');
    ga.addQuery('source', 'Health Log Analytics');
    ga.addQuery('severity', '<=', '2'); // Critical or Major
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.groupBy('ci');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.setLimit(20);
    ga.query();

    gs.info('\n--- CIs with Most HLA Alerts (Last 30 Days) ---');
    while (ga.next()) {
      var ciId = ga.ci.toString();
      var count = ga.getAggregate('COUNT');
      var ci = new GlideRecord('cmdb_ci');
      if (ci.get(ciId)) {
        gs.info('CI: ' + ci.name + ' (' + ci.sys_class_name + ') | Alerts: ' + count + ' | Status: ' + ci.operational_status.getDisplayValue());
      }
    }

    // Identify anomalies with upward trends (capacity risk)
    gs.info('\n--- Active Anomalies Indicating Growth ---');
    var anomaly = new GlideRecord('sa_anomaly');
    anomaly.addQuery('state', 'active');
    anomaly.addQuery('actual_value', '>', 'expected_value');
    anomaly.orderByDesc('deviation');
    anomaly.setLimit(15);
    anomaly.query();

    while (anomaly.next()) {
      gs.info('CI: ' + anomaly.ci.getDisplayValue() + ' | Metric: ' + anomaly.metric_definition.getDisplayValue() + ' | Expected: ' + anomaly.expected_value + ' | Actual: ' + anomaly.actual_value + ' | Deviation: ' + anomaly.deviation + '%');
    }
```

### Step 6: Performance Trending Report

Generate a performance summary for critical infrastructure.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate performance trending summary for critical services
  script: |
    gs.info('=== PERFORMANCE TRENDING REPORT ===');

    // Alerts by severity over time
    gs.info('\n--- Alert Trend (Last 7 Days) ---');
    for (var d = 6; d >= 0; d--) {
      var dayStart = gs.daysAgo(d + 1);
      var dayEnd = gs.daysAgo(d);

      var ga = new GlideAggregate('em_alert');
      ga.addQuery('source', 'Health Log Analytics');
      ga.addQuery('sys_created_on', '>=', dayStart);
      ga.addQuery('sys_created_on', '<', dayEnd);
      ga.addAggregate('COUNT');
      ga.query();
      ga.next();
      var count = ga.getAggregate('COUNT');

      var dt = new GlideDateTime(dayStart);
      gs.info(dt.getDate().getByFormat('yyyy-MM-dd') + ': ' + count + ' alerts');
    }

    // Top alerting CIs
    gs.info('\n--- Top 10 Alerting CIs (Last 7 Days) ---');
    var topCI = new GlideAggregate('em_alert');
    topCI.addQuery('source', 'Health Log Analytics');
    topCI.addQuery('sys_created_on', '>=', gs.daysAgo(7));
    topCI.addAggregate('COUNT');
    topCI.groupBy('ci');
    topCI.orderByAggregate('COUNT', 'DESC');
    topCI.setLimit(10);
    topCI.query();

    while (topCI.next()) {
      gs.info('CI: ' + topCI.ci.getDisplayValue() + ' | Alerts: ' + topCI.getAggregate('COUNT'));
    }

    // Threshold breach distribution
    gs.info('\n--- Threshold Breaches by Metric ---');
    var thr = new GlideAggregate('em_alert');
    thr.addQuery('source', 'Health Log Analytics');
    thr.addQuery('sys_created_on', '>=', gs.daysAgo(7));
    thr.addAggregate('COUNT');
    thr.groupBy('metric_name');
    thr.orderByAggregate('COUNT', 'DESC');
    thr.setLimit(10);
    thr.query();

    while (thr.next()) {
      gs.info('Metric: ' + thr.metric_name + ' | Breaches: ' + thr.getAggregate('COUNT'));
    }
```

### Step 7: Tune Threshold Policies

Adjust thresholds based on trending data to reduce false positives.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sa_threshold
  sys_id: [threshold_sys_id]
  data:
    warning_value: 85
    critical_value: 97
    duration: 600
```

**Using REST API:**
```bash
PATCH /api/now/table/sa_threshold/[threshold_sys_id]
Content-Type: application/json

{
  "warning_value": "85",
  "critical_value": "97",
  "duration": "600"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query log sources, metrics, thresholds, anomalies, alerts |
| `SN-Get-Record` | Retrieve specific metric definition or threshold details |
| `SN-Create-Record` | Create new thresholds, log sources, or metric definitions |
| `SN-Update-Record` | Tune thresholds or update log source configuration |
| `SN-Execute-Background-Script` | Capacity analysis, trending reports, bulk validation |
| `SN-NL-Search` | Natural language queries like "servers with CPU anomalies" |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sa_log_source` | GET/POST | Manage log sources |
| `/api/now/table/sa_metric_definition` | GET | View metric definitions |
| `/api/now/table/sa_threshold` | GET/POST/PATCH | Manage thresholds |
| `/api/now/table/sa_anomaly` | GET | View detected anomalies |
| `/api/now/table/em_alert` | GET | View HLA-generated alerts |

## Best Practices

- **Baseline Before Alerting:** Allow HLA to build 2-4 weeks of baseline data before configuring aggressive thresholds
- **Use Duration Windows:** Set threshold duration to 5-10 minutes to avoid alerting on transient spikes
- **Layer Thresholds:** Create both warning and critical thresholds to provide early warning before critical impact
- **Review Anomalies Weekly:** Schedule weekly reviews of anomaly detections to identify emerging capacity trends
- **Correlate with Changes:** Cross-reference anomaly detections with recent change requests to distinguish expected from unexpected behavior
- **Tune Iteratively:** Start with conservative thresholds and tighten based on operational experience

## Troubleshooting

### No Metrics Being Collected

**Cause:** Log source not active, MID Server offline, or credentials invalid
**Solution:** Check `sa_log_source.status` for errors. Verify MID Server connectivity. Test credentials from the MID Server host.

### False Positive Anomalies

**Cause:** Insufficient baseline data or scheduled maintenance not excluded
**Solution:** Extend the baseline learning period. Configure maintenance windows to exclude known scheduled activities from anomaly detection.

### Threshold Alerts Not Firing

**Cause:** Threshold not linked to the correct metric definition or CI type, or duration window too long
**Solution:** Verify `metric_definition` reference on the threshold. Check that `ci_type` matches the monitored CIs. Reduce duration if spikes are short-lived.

### HLA Dashboard Shows Stale Data

**Cause:** Collection interval too long or log source polling stopped
**Solution:** Check `sa_log_source.last_collection_time`. Verify collection schedule is active. Review MID Server logs for collection errors.

## Examples

### Example 1: Server Capacity Review

```
# 1. Find servers with high-severity anomalies
Tool: SN-Query-Table
Parameters:
  table_name: sa_anomaly
  query: state=active^ci.sys_class_name=cmdb_ci_server^severity<=2
  fields: ci,metric_definition,severity,actual_value,expected_value,deviation,detection_time
  limit: 20

# 2. Check threshold configuration for those servers
Tool: SN-Query-Table
Parameters:
  table_name: sa_threshold
  query: ci_type=cmdb_ci_server^active=true
  fields: name,metric_definition,warning_value,critical_value,duration
  limit: 20
```

### Example 2: Log Source Health Check

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Check log source collection health
  script: |
    var ga = new GlideAggregate('sa_log_source');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.groupBy('status');
    ga.query();

    gs.info('=== LOG SOURCE STATUS SUMMARY ===');
    while (ga.next()) {
      gs.info('Status: ' + ga.status.getDisplayValue() + ' | Count: ' + ga.getAggregate('COUNT'));
    }

    // Find stale log sources (no collection in 24 hours)
    gs.info('\n--- Stale Log Sources ---');
    var stale = new GlideRecord('sa_log_source');
    stale.addQuery('active', true);
    stale.addQuery('last_collection_time', '<', gs.daysAgo(1));
    stale.query();
    while (stale.next()) {
      gs.info('Source: ' + stale.name + ' | Last Collected: ' + stale.last_collection_time + ' | CI: ' + stale.ci.getDisplayValue());
    }
```

### Example 3: Weekly Performance Summary

```
Tool: SN-NL-Search
Parameters:
  table_name: em_alert
  query: "critical health log analytics alerts created in the last 7 days"
  fields: number,ci,severity,metric_name,description,sys_created_on
  limit: 25
```

## Related Skills

- `itom/observability-integration` - Feed external metrics into HLA
- `itom/alert-analysis` - Analyze HLA-generated alerts
- `itom/service-mapping` - Correlate HLA data with service topology
- `reporting/trend-analysis` - Build reports from HLA metric data

## References

- [ServiceNow Health Log Analytics](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/health-log-analytics/concept/c_HealthLogAnalytics.html)
- [Metric Definitions](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/health-log-analytics/task/t_ConfigureMetricDefinitions.html)
- [Anomaly Detection](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/health-log-analytics/concept/c_AnomalyDetection.html)
