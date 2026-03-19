---
name: observability-integration
version: 1.0.0
description: Integrate observability data from Datadog, Dynatrace, and New Relic into ServiceNow ITOM, covering metric ingestion, alert normalization, and event management connectors
author: Happy Technologies LLC
tags: [itom, observability, datadog, dynatrace, new-relic, monitoring, alerts, event-management, integration]
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
    - /api/now/table/em_event
    - /api/now/table/em_connector_instance
    - /api/now/table/em_connector_type
    - /api/now/table/em_match_rule
    - /api/now/table/cmdb_ci
    - /api/now/table/sa_metric_definition
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Observability Integration

## Overview

This skill provides a structured approach to integrating third-party observability platforms with ServiceNow ITOM Event Management. It covers:

- Configuring event management connectors for Datadog, Dynatrace, and New Relic
- Normalizing incoming alerts to ServiceNow severity and priority standards
- Mapping external metrics to ServiceNow metric definitions
- Building alert correlation rules to reduce noise and group related events
- Validating end-to-end data flow from external monitoring to ServiceNow alerts
- Troubleshooting broken or misconfigured integrations

**When to use:** When operations teams need to centralize monitoring data from multiple observability platforms into ServiceNow for unified alert management, incident creation, and service health dashboards.

**Plugin required:** `com.snc.em` (Event Management)

## Prerequisites

- **Roles:** `evt_mgmt_admin`, `evt_mgmt_integration`, or `admin`
- **Access:** Read/write to `em_event`, `em_alert`, `em_connector_instance`, `em_match_rule`
- **Knowledge:** Familiarity with Event Management concepts, connector architecture, and the target observability platform's webhook/API capabilities
- **Plugins:** `com.snc.em` must be activated; MID Server configured for pull-based connectors
- **External:** API keys or webhook credentials for Datadog, Dynatrace, or New Relic

## Procedure

### Step 1: Review Existing Connector Instances

Inventory current event management connectors to understand what is already integrated.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_connector_instance
  query: active=true^ORDERBYname
  fields: sys_id,name,connector_type,status,last_run_time,last_run_status,mid_server,polling_interval
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/em_connector_instance?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,connector_type,status,last_run_time,last_run_status,mid_server,polling_interval&sysparm_display_value=true&sysparm_limit=50
```

### Step 2: Review Available Connector Types

Identify supported connector types for your target observability platform.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_connector_type
  query: active=true^nameLIKEdatadog^ORnameLIKEdynatrace^ORnameLIKEnew relic^ORnameLIKEgeneric
  fields: sys_id,name,description,connector_class,direction,protocol
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/em_connector_type?sysparm_query=active=true^nameLIKEdatadog^ORnameLIKEdynatrace^ORnameLIKEnew relic^ORnameLIKEgeneric&sysparm_fields=sys_id,name,description,connector_class,direction,protocol&sysparm_display_value=true&sysparm_limit=20
```

**Common Connector Types:**
| Platform   | Connector Type           | Direction | Protocol    |
|-----------|--------------------------|-----------|-------------|
| Datadog   | Datadog Connector        | Pull      | REST API    |
| Datadog   | Generic Webhook          | Push      | Webhook     |
| Dynatrace | Dynatrace Connector      | Pull      | REST API    |
| New Relic  | New Relic Connector      | Pull      | REST API    |
| Generic   | Generic REST Connector   | Pull/Push | REST API    |

### Step 3: Configure a New Connector Instance

Create a connector instance for the target observability platform.

**Using MCP (Datadog example):**
```
Tool: SN-Create-Record
Parameters:
  table_name: em_connector_instance
  data:
    name: Datadog Production Alerts
    connector_type: [connector_type_sys_id]
    active: true
    polling_interval: 60
    mid_server: [mid_server_name]
    url: https://api.datadoghq.com/api/v1/monitor
    api_key: [datadog_api_key]
    application_key: [datadog_app_key]
```

**Using REST API:**
```bash
POST /api/now/table/em_connector_instance
Content-Type: application/json

{
  "name": "Datadog Production Alerts",
  "connector_type": "[connector_type_sys_id]",
  "active": "true",
  "polling_interval": "60",
  "mid_server": "[mid_server_name]",
  "url": "https://api.datadoghq.com/api/v1/monitor"
}
```

### Step 4: Configure Alert Normalization Rules

Map external severity levels to ServiceNow alert severity.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Review and report on existing alert normalization mappings
  script: |
    gs.info('=== ALERT NORMALIZATION MAPPING ===');

    // Review existing match rules
    var mr = new GlideRecord('em_match_rule');
    mr.addQuery('active', true);
    mr.orderBy('order');
    mr.query();

    gs.info('\n--- Active Match Rules ---');
    while (mr.next()) {
      gs.info('Rule: ' + mr.name + ' | Order: ' + mr.order + ' | Source: ' + mr.source + ' | Severity Map: ' + mr.severity);
    }

    // Severity mapping reference
    gs.info('\n--- ServiceNow Severity Reference ---');
    gs.info('1 = Critical');
    gs.info('2 = Major');
    gs.info('3 = Minor');
    gs.info('4 = Warning');
    gs.info('5 = Info');
    gs.info('0 = Clear');

    // External platform mapping suggestions
    gs.info('\n--- Suggested Datadog Mappings ---');
    gs.info('Datadog "Alert" -> SN Severity 1 (Critical)');
    gs.info('Datadog "Warn"  -> SN Severity 3 (Minor)');
    gs.info('Datadog "No Data" -> SN Severity 4 (Warning)');
    gs.info('Datadog "OK"    -> SN Severity 0 (Clear)');

    gs.info('\n--- Suggested Dynatrace Mappings ---');
    gs.info('Dynatrace "AVAILABILITY" -> SN Severity 1 (Critical)');
    gs.info('Dynatrace "ERROR"        -> SN Severity 2 (Major)');
    gs.info('Dynatrace "SLOWDOWN"     -> SN Severity 3 (Minor)');
    gs.info('Dynatrace "RESOURCE"     -> SN Severity 4 (Warning)');
    gs.info('Dynatrace "CUSTOM"       -> SN Severity 5 (Info)');

    gs.info('\n--- Suggested New Relic Mappings ---');
    gs.info('New Relic "CRITICAL" -> SN Severity 1 (Critical)');
    gs.info('New Relic "WARNING"  -> SN Severity 3 (Minor)');
    gs.info('New Relic "NOT_CONFIGURED" -> SN Severity 5 (Info)');
```

### Step 5: Validate Incoming Events

Verify that events are flowing from the external platform into ServiceNow.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_event
  query: source=Datadog^ORsource=Dynatrace^ORsource=New Relic^ORDERBYDESCtime_of_event
  fields: sys_id,source,node,type,resource,metric_name,severity,description,time_of_event,state
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/em_event?sysparm_query=source=Datadog^ORsource=Dynatrace^ORsource=New Relic^ORDERBYDESCtime_of_event&sysparm_fields=sys_id,source,node,type,resource,metric_name,severity,description,time_of_event,state&sysparm_display_value=true&sysparm_limit=25
```

### Step 6: Review Generated Alerts

Check alerts created from ingested events and verify CI binding.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: source=Datadog^ORsource=Dynatrace^ORsource=New Relic^state!=Closed^ORDERBYDESCsys_created_on
  fields: sys_id,number,source,node,ci,severity,state,description,group_source,acknowledged,sys_created_on
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/em_alert?sysparm_query=source=Datadog^ORsource=Dynatrace^ORsource=New Relic^state!=Closed^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,source,node,ci,severity,state,description,group_source,acknowledged,sys_created_on&sysparm_display_value=true&sysparm_limit=25
```

### Step 7: Analyze CI Binding Accuracy

Verify that alerts are correctly bound to CMDB CIs.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze CI binding rates for external observability alerts
  script: |
    gs.info('=== CI BINDING ANALYSIS ===');

    var sources = ['Datadog', 'Dynatrace', 'New Relic'];

    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];

      var total = new GlideAggregate('em_alert');
      total.addQuery('source', src);
      total.addAggregate('COUNT');
      total.query();
      total.next();
      var totalCount = parseInt(total.getAggregate('COUNT'));

      if (totalCount === 0) continue;

      var bound = new GlideAggregate('em_alert');
      bound.addQuery('source', src);
      bound.addQuery('ci', '!=', '');
      bound.addAggregate('COUNT');
      bound.query();
      bound.next();
      var boundCount = parseInt(bound.getAggregate('COUNT'));

      var unbound = totalCount - boundCount;
      var rate = Math.round((boundCount / totalCount) * 100);

      gs.info(src + ': Total=' + totalCount + ' | Bound=' + boundCount + ' | Unbound=' + unbound + ' | Rate=' + rate + '%');

      // Show unbound alert nodes for troubleshooting
      if (unbound > 0) {
        var ub = new GlideRecord('em_alert');
        ub.addQuery('source', src);
        ub.addQuery('ci', '');
        ub.setLimit(5);
        ub.query();
        while (ub.next()) {
          gs.info('  Unbound: node=' + ub.node + ' | resource=' + ub.resource + ' | type=' + ub.type);
        }
      }
    }
```

### Step 8: Configure Metric Ingestion

Map external metrics to ServiceNow metric definitions for Health Log Analytics.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_metric_definition
  query: active=true^ORDERBYname
  fields: sys_id,name,description,ci_type,metric_type,unit,source
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sa_metric_definition?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,description,ci_type,metric_type,unit,source&sysparm_display_value=true&sysparm_limit=30
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query connectors, events, alerts, match rules |
| `SN-Get-Record` | Retrieve specific connector or alert details |
| `SN-Create-Record` | Create new connector instances or match rules |
| `SN-Update-Record` | Modify connector configuration or alert states |
| `SN-Execute-Background-Script` | CI binding analysis, bulk validation, normalization review |
| `SN-NL-Search` | Natural language queries like "unbound alerts from Datadog" |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/em_connector_instance` | GET/POST | Manage connector instances |
| `/api/now/table/em_connector_type` | GET | List available connector types |
| `/api/now/table/em_event` | GET | View raw ingested events |
| `/api/now/table/em_alert` | GET | View processed alerts |
| `/api/now/table/em_match_rule` | GET/POST | Manage alert normalization rules |
| `/api/now/table/sa_metric_definition` | GET | View metric definitions |

## Best Practices

- **Normalize Early:** Configure severity and priority mappings before enabling connectors in production to prevent alert storms
- **Bind to CIs:** Ensure external hostnames map to CMDB CI names; use discovery or import sets to synchronize naming conventions
- **Deduplicate Sources:** Avoid monitoring the same resource from multiple platforms without deduplication rules
- **Test in Sub-Production:** Validate connector configuration and alert volume in a sub-production instance before promoting
- **Set Polling Intervals Wisely:** Balance freshness against API rate limits; 60-120 seconds is typical for production
- **Monitor Connector Health:** Schedule regular reviews of `last_run_status` to catch silent failures

## Troubleshooting

### Connector Shows "Error" Status

**Cause:** Authentication failure, API endpoint unreachable, or MID Server connectivity issue
**Solution:** Verify API keys and endpoint URLs. Check MID Server logs for network errors. Test the external API directly from the MID Server host.

### Events Ingested but No Alerts Created

**Cause:** Event processing rules or match rules not matching the incoming event payload
**Solution:** Review `em_event` records for the raw payload. Check that `node`, `type`, `resource` fields match the expected format in match rules.

### Alerts Not Binding to CIs

**Cause:** The `node` value from the external platform does not match any CI `name`, `fqdn`, or `ip_address` in the CMDB
**Solution:** Create CI lookup rules or transform maps to reconcile external hostnames with CMDB naming. Use the `em_binding_rule` table for custom binding logic.

### High Alert Volume / Alert Storm

**Cause:** Insufficient filtering at the connector level or overly broad monitoring scopes
**Solution:** Apply filters in the connector configuration to limit which monitors/alerts are ingested. Use alert management rules to suppress low-value alerts.

## Examples

### Example 1: Datadog Integration Health Check

```
# 1. Check connector status
Tool: SN-Query-Table
Parameters:
  table_name: em_connector_instance
  query: nameLIKEDatadog
  fields: sys_id,name,status,last_run_time,last_run_status,polling_interval
  limit: 5

# 2. View recent Datadog events
Tool: SN-Query-Table
Parameters:
  table_name: em_event
  query: source=Datadog^ORDERBYDESCtime_of_event
  fields: source,node,type,severity,description,time_of_event
  limit: 10

# 3. View resulting alerts
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: source=Datadog^state!=Closed^ORDERBYDESCsys_created_on
  fields: number,node,ci,severity,state,description
  limit: 10
```

### Example 2: Severity Mapping Audit

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Audit severity distribution by source
  script: |
    var sources = ['Datadog', 'Dynatrace', 'New Relic'];
    for (var i = 0; i < sources.length; i++) {
      var ga = new GlideAggregate('em_alert');
      ga.addQuery('source', sources[i]);
      ga.addQuery('state', '!=', 'Closed');
      ga.addAggregate('COUNT');
      ga.groupBy('severity');
      ga.query();

      gs.info('=== ' + sources[i] + ' Alert Severity Distribution ===');
      while (ga.next()) {
        gs.info('Severity ' + ga.severity.getDisplayValue() + ': ' + ga.getAggregate('COUNT'));
      }
    }
```

### Example 3: Cross-Platform Alert Comparison

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Compare alert volumes and CI binding across observability platforms
  script: |
    gs.info('=== CROSS-PLATFORM COMPARISON ===');
    var sources = ['Datadog', 'Dynatrace', 'New Relic'];
    for (var i = 0; i < sources.length; i++) {
      var ga = new GlideAggregate('em_alert');
      ga.addQuery('source', sources[i]);
      ga.addQuery('sys_created_on', '>=', gs.daysAgo(7));
      ga.addAggregate('COUNT');
      ga.query();
      ga.next();
      var count = ga.getAggregate('COUNT');
      gs.info(sources[i] + ' alerts (last 7 days): ' + count);
    }
```

## Related Skills

- `itom/alert-analysis` - Analyze and manage alerts from any source
- `itom/service-mapping` - Map observability data to business services
- `itom/health-log-analytics` - Use ingested metrics for anomaly detection
- `cmdb/relationship-mapping` - Ensure CIs are properly represented for alert binding

## References

- [ServiceNow Event Management](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/concept/c_EventManagement.html)
- [Connector Configuration](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/task/t_ConfigureConnectorInstances.html)
- [Alert Normalization](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/event-management/concept/c_EventRules.html)
