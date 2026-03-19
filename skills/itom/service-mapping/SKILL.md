---
name: service-mapping
version: 1.0.0
description: Discover and validate service maps, identify mapping gaps, analyze service dependencies, and troubleshoot discovery patterns in ServiceNow ITOM
author: Happy Technologies LLC
tags: [itom, service-mapping, discovery, dependencies, cmdb, topology, patterns]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-NL-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/cmdb_ci_service
    - /api/now/table/svc_ci_assoc
    - /api/now/table/sa_pattern
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/cmdb_ci
    - /api/now/table/em_alert
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Service Mapping

## Overview

This skill provides a structured approach to managing service maps in ServiceNow ITOM Service Mapping. It covers:

- Discovering and viewing business service topologies
- Validating service map completeness and accuracy
- Identifying unmapped or orphaned CIs that should belong to a service
- Analyzing service dependency chains for impact assessment
- Reviewing and troubleshooting discovery patterns
- Detecting mapping gaps between services and their underlying infrastructure

**When to use:** When operations or service owners need to understand service topology, validate discovery results, troubleshoot broken service maps, or prepare for change impact analysis.

**Plugin required:** `com.snc.service-mapping`

## Prerequisites

- **Roles:** `sm_admin`, `sm_user`, `itil`, or `cmdb_read`
- **Access:** Read/write to `cmdb_ci_service`, `svc_ci_assoc`, `sa_pattern`, `cmdb_rel_ci`
- **Knowledge:** Familiarity with CMDB CI classes, service mapping concepts, and discovery patterns
- **Plugins:** `com.snc.service-mapping` and `com.snc.service-watch` must be activated

## Procedure

### Step 1: List Business Services and Their Health

Retrieve all defined business services to understand the service landscape.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_service
  query: active=true^ORDERBYname
  fields: sys_id,name,number,operational_status,busines_criticality,owned_by,support_group,sys_class_name,sys_updated_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci_service?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,number,operational_status,busines_criticality,owned_by,support_group,sys_class_name,sys_updated_on&sysparm_display_value=true&sysparm_limit=50
```

**Operational Status Values:**
| Value | Label        | Description                       |
|-------|-------------|-----------------------------------|
| 1     | Operational  | Service is running normally       |
| 2     | Repair       | Under repair or maintenance       |
| 3     | Non-Operational | Service is down              |
| 4     | DR Standby   | Disaster recovery standby         |

### Step 2: View Service Map CI Associations

Retrieve all CIs mapped to a specific business service to see its topology.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: service=[service_sys_id]
  fields: sys_id,service,ci_id,ci_id.name,ci_id.sys_class_name,ci_id.operational_status,port,type,is_manual
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/svc_ci_assoc?sysparm_query=service=[service_sys_id]&sysparm_fields=sys_id,service,ci_id,port,type,is_manual&sysparm_display_value=true&sysparm_limit=100
```

### Step 3: Analyze Service Dependencies

Trace upstream and downstream dependencies for a business service.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Map service dependency tree for a business service
  script: |
    var svcId = '[service_sys_id]';

    gs.info('=== SERVICE DEPENDENCY ANALYSIS ===');

    // Upstream dependencies (services this service depends on)
    gs.info('\n--- UPSTREAM DEPENDENCIES (Depends On) ---');
    var upstream = new GlideRecord('cmdb_rel_ci');
    upstream.addQuery('child', svcId);
    upstream.addQuery('type.name', 'Depends on::Used by');
    upstream.query();
    while (upstream.next()) {
      var parent = upstream.parent.getRefRecord();
      gs.info('Depends on: ' + parent.name + ' (' + parent.sys_class_name + ') | Status: ' + parent.operational_status.getDisplayValue());
    }

    // Downstream dependencies (services that depend on this)
    gs.info('\n--- DOWNSTREAM DEPENDENCIES (Used By) ---');
    var downstream = new GlideRecord('cmdb_rel_ci');
    downstream.addQuery('parent', svcId);
    downstream.addQuery('type.name', 'Depends on::Used by');
    downstream.query();
    while (downstream.next()) {
      var child = downstream.child.getRefRecord();
      gs.info('Used by: ' + child.name + ' (' + child.sys_class_name + ') | Status: ' + child.operational_status.getDisplayValue());
    }

    // CI count by class
    gs.info('\n--- CI COMPOSITION ---');
    var ga = new GlideAggregate('svc_ci_assoc');
    ga.addQuery('service', svcId);
    ga.addAggregate('COUNT');
    ga.groupBy('ci_id.sys_class_name');
    ga.query();
    while (ga.next()) {
      gs.info('Class: ' + ga.ci_id.sys_class_name + ' | Count: ' + ga.getAggregate('COUNT'));
    }
```

**Using REST API:**
```bash
# Upstream dependencies
GET /api/now/table/cmdb_rel_ci?sysparm_query=child=[service_sys_id]^type.name=Depends on::Used by&sysparm_fields=parent,type&sysparm_display_value=true

# Downstream dependencies
GET /api/now/table/cmdb_rel_ci?sysparm_query=parent=[service_sys_id]^type.name=Depends on::Used by&sysparm_fields=child,type&sysparm_display_value=true
```

### Step 4: Review Discovery Patterns

Examine service mapping patterns to understand how CIs are discovered and mapped.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_pattern
  query: active=true^ORDERBYname
  fields: sys_id,name,description,ci_type,status,pattern_type,last_run,run_count,success_count,failure_count
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sa_pattern?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,description,ci_type,status,pattern_type,last_run,run_count,success_count,failure_count&sysparm_display_value=true&sysparm_limit=50
```

**Pattern Status Reference:**
| Status     | Description                                    |
|-----------|-----------------------------------------------|
| Ready     | Pattern is ready to run                        |
| Running   | Pattern is currently executing                 |
| Completed | Last run completed successfully                |
| Failed    | Last run encountered errors                    |
| Disabled  | Pattern is inactive                            |

### Step 5: Identify Mapping Gaps

Find CIs that are not associated with any business service.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find CIs with no service association (potential mapping gaps)
  script: |
    gs.info('=== SERVICE MAPPING GAP ANALYSIS ===');

    // Find servers not mapped to any service
    var ciClasses = ['cmdb_ci_server', 'cmdb_ci_app_server', 'cmdb_ci_db_instance', 'cmdb_ci_lb'];

    for (var i = 0; i < ciClasses.length; i++) {
      var className = ciClasses[i];
      var gr = new GlideRecord(className);
      gr.addQuery('operational_status', '1'); // Operational only
      gr.addQuery('install_status', '1');     // Installed
      gr.addJoinQuery('svc_ci_assoc', 'sys_id', 'ci_id', true); // LEFT JOIN - no association
      gr.setLimit(20);
      gr.query();

      if (gr.getRowCount() > 0) {
        gs.info('\n--- Unmapped ' + className + ' (showing up to 20) ---');
        while (gr.next()) {
          gs.info('CI: ' + gr.name + ' | IP: ' + gr.ip_address + ' | Location: ' + gr.location.getDisplayValue());
        }
      }
    }

    // Count total mapped vs unmapped
    gs.info('\n--- MAPPING COVERAGE SUMMARY ---');
    var totalCIs = new GlideAggregate('cmdb_ci');
    totalCIs.addQuery('install_status', '1');
    totalCIs.addAggregate('COUNT');
    totalCIs.query();
    totalCIs.next();
    var total = parseInt(totalCIs.getAggregate('COUNT'));

    var mappedCIs = new GlideAggregate('svc_ci_assoc');
    mappedCIs.addAggregate('COUNT', 'DISTINCT', 'ci_id');
    mappedCIs.query();
    mappedCIs.next();
    var mapped = parseInt(mappedCIs.getAggregate('COUNT', 'DISTINCT', 'ci_id'));

    gs.info('Total installed CIs: ' + total);
    gs.info('CIs mapped to services: ' + mapped);
    gs.info('Unmapped CIs: ' + (total - mapped));
    gs.info('Coverage: ' + Math.round((mapped / total) * 100) + '%');
```

### Step 6: Validate Service Map Accuracy

Cross-reference service maps with active alerts to detect stale or incorrect mappings.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Cross-reference service maps with alerts
  script: |
    gs.info('=== SERVICE MAP VALIDATION ===');

    var svc = new GlideRecord('cmdb_ci_service');
    svc.addQuery('active', true);
    svc.query();

    while (svc.next()) {
      // Check for alerts on CIs in this service
      var assoc = new GlideRecord('svc_ci_assoc');
      assoc.addQuery('service', svc.sys_id.toString());
      assoc.query();

      var alertCount = 0;
      var staleCIs = 0;

      while (assoc.next()) {
        var ciId = assoc.ci_id.toString();

        // Check for active alerts
        var alert = new GlideAggregate('em_alert');
        alert.addQuery('ci', ciId);
        alert.addQuery('state', '!=', 'Closed');
        alert.addAggregate('COUNT');
        alert.query();
        if (alert.next()) {
          alertCount += parseInt(alert.getAggregate('COUNT'));
        }

        // Check for stale CIs (not updated in 90 days)
        var ci = new GlideRecord('cmdb_ci');
        if (ci.get(ciId)) {
          var lastUpdate = new GlideDateTime(ci.sys_updated_on.toString());
          var cutoff = new GlideDateTime();
          cutoff.addDaysLocalTime(-90);
          if (lastUpdate.before(cutoff)) {
            staleCIs++;
          }
        }
      }

      if (alertCount > 0 || staleCIs > 0) {
        gs.info('Service: ' + svc.name + ' | Active Alerts: ' + alertCount + ' | Stale CIs: ' + staleCIs);
      }
    }
```

### Step 7: Troubleshoot Failed Discovery Patterns

Investigate patterns that have failed or produced unexpected results.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sa_pattern
  query: status=Failed^ORactive=true^failure_count>0
  fields: sys_id,name,ci_type,status,last_run,failure_count,success_count,error_message
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sa_pattern?sysparm_query=status=Failed^ORactive=true^failure_count>0&sysparm_fields=sys_id,name,ci_type,status,last_run,failure_count,success_count,error_message&sysparm_display_value=true&sysparm_limit=20
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query services, associations, patterns, relationships |
| `SN-Get-Record` | Retrieve a single service or pattern record |
| `SN-Update-Record` | Update service status or pattern configuration |
| `SN-NL-Search` | Natural language searches like "services with failed patterns" |
| `SN-Execute-Background-Script` | Dependency analysis, gap detection, bulk validation |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/cmdb_ci_service` | GET | Query business services |
| `/api/now/table/svc_ci_assoc` | GET | Service-to-CI associations |
| `/api/now/table/sa_pattern` | GET | Discovery patterns |
| `/api/now/table/cmdb_rel_ci` | GET | CI relationships and dependencies |
| `/api/now/table/em_alert` | GET | Cross-reference alerts with service CIs |

## Best Practices

- **Map Top-Down:** Start with business services and map downward to infrastructure to ensure business context
- **Validate After Discovery:** Always review new pattern results before promoting to production service maps
- **Monitor Coverage Metrics:** Track the percentage of operational CIs mapped to services and set improvement targets
- **Use Manual Entries Sparingly:** Manual CI associations bypass discovery validation; prefer pattern-driven mapping
- **Review Stale Mappings:** Schedule quarterly reviews to remove decommissioned CIs from service maps
- **Correlate with Change Management:** Validate service maps after major changes to ensure topology accuracy

## Troubleshooting

### Pattern Fails with Credential Error

**Cause:** Discovery credentials are expired or lack permissions on the target host
**Solution:** Verify credentials in Discovery Credentials module. Test SSH/WMI/SNMP connectivity from the MID Server.

### CIs Missing from Service Map

**Cause:** Pattern does not cover the CI class or entry point is incorrect
**Solution:** Review the pattern's entry point configuration. Check if the CI class has an applicable pattern. Verify network reachability from the MID Server.

### Duplicate CIs in Service Map

**Cause:** Reconciliation rules not matching correctly, leading to duplicate CI creation
**Solution:** Review IRE (Identification and Reconciliation Engine) rules for the affected CI class. Check `discovery_source` field for conflicting sources.

### Service Map Shows Stale Topology

**Cause:** Discovery schedule not running or pattern disabled
**Solution:** Verify the discovery schedule is active and running on the correct MID Server. Check `sa_pattern.last_run` to confirm execution.

## Examples

### Example 1: Full Service Topology Report

```
# 1. Get the business service
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_service
  query: name=Email Service
  fields: sys_id,name,operational_status,busines_criticality,owned_by
  limit: 1

# 2. Get all CIs in the service map
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: service=[service_sys_id]
  fields: ci_id,ci_id.name,ci_id.sys_class_name,ci_id.operational_status,port,type
  limit: 200

# 3. Get dependency relationships
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[service_sys_id]^ORchild=[service_sys_id]
  fields: parent,child,type
  limit: 50
```

### Example 2: Pre-Change Impact Assessment

```
# 1. Find all services affected by a CI undergoing change
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: ci_id=[ci_sys_id]
  fields: service,service.name,service.busines_criticality,type
  limit: 20

# 2. For each affected service, get downstream consumers
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[service_sys_id]^type.name=Depends on::Used by
  fields: child,child.name,child.sys_class_name
  limit: 50
```

### Example 3: Discovery Pattern Health Check

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Summary of pattern health
  script: |
    var ga = new GlideAggregate('sa_pattern');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.groupBy('status');
    ga.query();

    gs.info('=== PATTERN HEALTH SUMMARY ===');
    while (ga.next()) {
      gs.info('Status: ' + ga.status.getDisplayValue() + ' | Count: ' + ga.getAggregate('COUNT'));
    }
```

## Related Skills

- `itom/alert-analysis` - Analyze alerts related to mapped services
- `itom/observability-integration` - Integrate external monitoring with service maps
- `itom/health-log-analytics` - Monitor health of mapped service components
- `cmdb/relationship-mapping` - CMDB relationship management
- `cmdb/impact-analysis` - Business impact analysis using service maps

## References

- [ServiceNow Service Mapping](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/service-mapping/concept/c_ServiceMapping.html)
- [Discovery Patterns](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/service-mapping/concept/c_Patterns.html)
- [Service Mapping Best Practices](https://docs.servicenow.com/bundle/utah-it-operations-management/page/product/service-mapping/reference/service-mapping-best-practices.html)
