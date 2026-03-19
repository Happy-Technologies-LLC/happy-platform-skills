---
name: esg-document-intelligence
version: 1.0.0
description: Extract and analyze ESG data from utility invoices and sustainability reports, tracking carbon emissions, energy consumption, waste metrics, and disclosure compliance across ESG frameworks
author: Happy Technologies LLC
tags: [grc, esg, sustainability, carbon-emissions, energy, waste, disclosure, climate, environmental]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
    - SN-Create-Record
    - SN-Update-Record
    - SN-Read-Record
  rest:
    - /api/now/table/sn_esg_metric
    - /api/now/table/sn_esg_disclosure
    - /api/now/table/sn_esg_framework
    - /api/now/table/sn_esg_data_point
    - /api/now/table/sys_attachment
    - /api/now/table/cmn_location
  native:
    - Bash
complexity: advanced
estimated_time: 25-45 minutes
---

# ESG Document Intelligence

## Overview

This skill extracts and analyzes Environmental, Social, and Governance (ESG) data from documents and ServiceNow records. It covers:

- Extracting energy consumption, carbon emissions, and waste data from utility invoices and reports
- Mapping extracted metrics to ESG framework requirements (GRI, SASB, TCFD, CDP, CSRD)
- Tracking Scope 1, 2, and 3 greenhouse gas emissions across facilities and time periods
- Analyzing disclosure completeness against regulatory and voluntary reporting frameworks
- Generating ESG performance dashboards with trend analysis and benchmarking
- Identifying data gaps that could impact disclosure accuracy or compliance

**When to use:**
- During annual ESG/sustainability report preparation
- When processing utility invoices to update environmental metrics
- Before CDP, GRI, or CSRD disclosure submissions
- When leadership needs a snapshot of environmental performance
- During ESG audits requiring metric traceability to source documents

## Prerequisites

- **Roles:** `sn_esg.admin`, `sn_esg.manager`, `sn_esg.data_entry`, or `admin`
- **Plugins:** `com.sn_esg` (ESG Management)
- **Access:** Read/write access to sn_esg_metric, sn_esg_disclosure, sn_esg_framework tables
- **Knowledge:** Understanding of ESG frameworks (GRI Standards, SASB, TCFD), GHG Protocol for emissions accounting, and your organization's materiality assessment

## Key ESG Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_esg_metric` | ESG performance metrics | number, metric_name, category, value, unit, period, location, scope, framework, data_source |
| `sn_esg_disclosure` | Framework disclosure responses | number, framework, disclosure_id, response, status, evidence, reporting_period, reviewer |
| `sn_esg_framework` | ESG framework definitions | name, version, category, standard_body, active, disclosure_count |
| `sn_esg_data_point` | Raw data points from sources | metric, value, date, source_document, location, verified, notes |
| `cmn_location` | Facility/location records | name, city, state, country, building, latitude, longitude |

## Procedure

### Step 1: Query Existing ESG Metrics

Retrieve current ESG metrics to understand the baseline.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_esg_metric
  query: active=true^ORDERBYcategory
  fields: sys_id,number,metric_name,category,value,unit,period,location,scope,framework,data_source,last_updated
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_esg_metric?sysparm_query=active=true^ORDERBYcategory&sysparm_fields=sys_id,number,metric_name,category,value,unit,period,location,scope,framework,data_source,last_updated&sysparm_limit=100&sysparm_display_value=true
```

### Step 2: Extract Data from Utility Invoices

Process utility invoice data to extract environmental metrics.

**Retrieve invoice attachments:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_attachment
  query: table_nameLIKEesg^ORtable_nameLIKEutility^ORtable_nameLIKEinvoice^content_typeLIKEpdf
  fields: sys_id,file_name,table_name,table_sys_id,content_type,size_bytes,sys_created_on
  limit: 50
  order_by_desc: sys_created_on
```

**Parse and record extracted energy data:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_esg_data_point
  fields:
    metric: [energy_metric_sys_id]
    value: 45230
    date: 2026-02-28
    source_document: "February 2026 Electric Utility Invoice - Building A"
    location: [location_sys_id]
    verified: false
    notes: "Extracted from utility invoice. 45,230 kWh electricity consumption."
```

### Step 3: Calculate Carbon Emissions

**Compute Scope 1, 2, and 3 emissions from source data:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // EPA emission factors (2025 US average)
    var EMISSION_FACTORS = {
      electricity_kwh: 0.000386, // metric tons CO2e per kWh (US avg grid)
      natural_gas_therm: 0.005302, // metric tons CO2e per therm
      diesel_gallon: 0.010180, // metric tons CO2e per gallon
      gasoline_gallon: 0.008887, // metric tons CO2e per gallon
      propane_gallon: 0.005740  // metric tons CO2e per gallon
    };

    var period = '2026-Q1';
    var emissions = {
      period: period,
      scope1: { total: 0, sources: {} },
      scope2: { total: 0, sources: {} },
      scope3: { total: 0, sources: {} },
      total_co2e: 0,
      unit: 'metric tons CO2e'
    };

    // Query energy data points for the period
    var dp = new GlideRecord('sn_esg_data_point');
    dp.addQuery('date', '>=', '2026-01-01');
    dp.addQuery('date', '<=', '2026-03-31');
    dp.query();

    while (dp.next()) {
      var metricRec = new GlideRecord('sn_esg_metric');
      metricRec.get(dp.metric.toString());
      var metricName = metricRec.metric_name.toString().toLowerCase();
      var value = parseFloat(dp.value.toString()) || 0;
      var scope = metricRec.scope.toString();

      var co2e = 0;
      if (metricName.match(/electricity/)) co2e = value * EMISSION_FACTORS.electricity_kwh;
      else if (metricName.match(/natural gas/)) co2e = value * EMISSION_FACTORS.natural_gas_therm;
      else if (metricName.match(/diesel/)) co2e = value * EMISSION_FACTORS.diesel_gallon;
      else if (metricName.match(/gasoline/)) co2e = value * EMISSION_FACTORS.gasoline_gallon;

      if (scope == '1') {
        emissions.scope1.total += co2e;
        emissions.scope1.sources[metricName] = (emissions.scope1.sources[metricName] || 0) + co2e;
      } else if (scope == '2') {
        emissions.scope2.total += co2e;
        emissions.scope2.sources[metricName] = (emissions.scope2.sources[metricName] || 0) + co2e;
      } else {
        emissions.scope3.total += co2e;
        emissions.scope3.sources[metricName] = (emissions.scope3.sources[metricName] || 0) + co2e;
      }
    }

    emissions.scope1.total = Math.round(emissions.scope1.total * 100) / 100;
    emissions.scope2.total = Math.round(emissions.scope2.total * 100) / 100;
    emissions.scope3.total = Math.round(emissions.scope3.total * 100) / 100;
    emissions.total_co2e = emissions.scope1.total + emissions.scope2.total + emissions.scope3.total;

    gs.info('EMISSIONS CALCULATION:\n' + JSON.stringify(emissions, null, 2));
  description: "ESG: Calculate GHG emissions by scope from energy data points"
```

### Step 4: Assess Disclosure Completeness

**Check which framework disclosures are complete vs. gaps:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var frameworks = ['GRI', 'SASB', 'TCFD', 'CDP'];
    var completeness = { reporting_period: '2025', frameworks: {} };

    for (var f = 0; f < frameworks.length; f++) {
      var fw = frameworks[f];
      completeness.frameworks[fw] = { total: 0, complete: 0, in_progress: 0, not_started: 0, gaps: [] };

      var disc = new GlideRecord('sn_esg_disclosure');
      disc.addQuery('framework.name', fw);
      disc.addQuery('reporting_period', '2025');
      disc.query();

      while (disc.next()) {
        completeness.frameworks[fw].total++;
        var status = disc.status.toString().toLowerCase();
        if (status == 'complete' || status == 'submitted') {
          completeness.frameworks[fw].complete++;
        } else if (status == 'in_progress' || status == 'draft') {
          completeness.frameworks[fw].in_progress++;
        } else {
          completeness.frameworks[fw].not_started++;
          completeness.frameworks[fw].gaps.push({
            disclosure_id: disc.disclosure_id.toString(),
            description: disc.short_description.toString()
          });
        }
      }
    }

    gs.info('DISCLOSURE COMPLETENESS:\n' + JSON.stringify(completeness, null, 2));
  description: "ESG: Assess disclosure completeness across ESG frameworks"
```

### Step 5: Generate ESG Performance Dashboard Data

**Compile trend data for executive reporting:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var dashboard = {
      generated_date: new GlideDateTime().toString(),
      environmental: {
        total_emissions_ytd: 0,
        emissions_vs_target: '',
        energy_consumption_kwh: 0,
        renewable_percentage: 0,
        waste_diverted_percentage: 0,
        water_usage_gallons: 0
      },
      yoy_comparison: {},
      by_location: {},
      data_quality: { verified: 0, unverified: 0, missing: 0 }
    };

    // Aggregate YTD metrics by category
    var categories = {
      'emissions': 'total_emissions_ytd',
      'energy': 'energy_consumption_kwh',
      'water': 'water_usage_gallons'
    };

    var metric = new GlideRecord('sn_esg_metric');
    metric.addQuery('category', 'environmental');
    metric.addQuery('active', true);
    metric.query();
    while (metric.next()) {
      var loc = metric.location.getDisplayValue() || 'Unknown';
      if (!dashboard.by_location[loc]) dashboard.by_location[loc] = { emissions: 0, energy: 0 };

      var val = parseFloat(metric.value.toString()) || 0;
      var mName = metric.metric_name.toString().toLowerCase();
      if (mName.match(/emission|co2|ghg/)) {
        dashboard.environmental.total_emissions_ytd += val;
        dashboard.by_location[loc].emissions += val;
      }
      if (mName.match(/energy|electricity|kwh/)) {
        dashboard.environmental.energy_consumption_kwh += val;
        dashboard.by_location[loc].energy += val;
      }
    }

    // Data quality check
    var dp = new GlideAggregate('sn_esg_data_point');
    dp.addQuery('verified', true);
    dp.addAggregate('COUNT');
    dp.query();
    if (dp.next()) dashboard.data_quality.verified = parseInt(dp.getAggregate('COUNT'));

    var dpUnverified = new GlideAggregate('sn_esg_data_point');
    dpUnverified.addQuery('verified', false);
    dpUnverified.addAggregate('COUNT');
    dpUnverified.query();
    if (dpUnverified.next()) dashboard.data_quality.unverified = parseInt(dpUnverified.getAggregate('COUNT'));

    gs.info('ESG DASHBOARD DATA:\n' + JSON.stringify(dashboard, null, 2));
  description: "ESG: Generate environmental performance dashboard data"
```

### Step 6: Update Metrics from Extracted Data

**Record newly extracted metrics back to the ESG module:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_esg_metric
  sys_id: [metric_sys_id]
  data:
    value: 1245.6
    last_updated: 2026-03-19
    data_source: "Utility invoices Q1 2026 - Buildings A, B, C"
    work_notes: "Updated from Q1 utility invoice extraction. Previous value: 1180.2. Increase of 5.5% due to expanded Building C operations."
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Metrics | SN-Query-Table | GET /api/now/table/sn_esg_metric |
| Query Disclosures | SN-Query-Table | GET /api/now/table/sn_esg_disclosure |
| Query Frameworks | SN-Query-Table | GET /api/now/table/sn_esg_framework |
| Create Data Points | SN-Create-Record | POST /api/now/table/sn_esg_data_point |
| Update Metrics | SN-Update-Record | PATCH /api/now/table/sn_esg_metric |
| Emissions Calculation | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Search Documents | SN-Natural-Language-Search | N/A |

## Best Practices

- **Source Traceability:** Always link data points to their source documents (invoices, reports) for audit trail
- **Emission Factor Currency:** Update emission factors annually; use regional grid factors rather than national averages when available
- **Verification Workflow:** Mark all extracted data as unverified until reviewed by the sustainability team
- **Scope Accuracy:** Carefully classify emissions by scope per GHG Protocol; market-based vs. location-based for Scope 2
- **Unit Consistency:** Standardize units across facilities (kWh, metric tons CO2e, gallons) before aggregation
- **Gap Documentation:** Document data gaps explicitly; estimated values should be flagged with methodology notes
- **Framework Alignment:** Map each metric to the specific GRI Standard, SASB topic, or TCFD recommendation it supports
- **Materiality Focus:** Prioritize metrics that align with your organization's materiality assessment results

## Troubleshooting

### ESG Metric Table Not Found

**Symptom:** Query against `sn_esg_metric` returns a table-not-found error
**Cause:** The ESG Management plugin may not be activated, or the table name may differ by version
**Solution:** Query `sys_db_object` with `nameLIKEesg` to find available ESG tables. Check if `com.sn_esg` plugin is active.

### Emission Factors Produce Incorrect Results

**Symptom:** Calculated emissions seem unreasonably high or low
**Cause:** Unit mismatch between input data and emission factor (e.g., MWh vs. kWh, therms vs. MMBtu)
**Solution:** Verify the unit field on both the metric and data point records. Convert units before applying emission factors.

### Disclosure Framework Records Missing

**Symptom:** No disclosure records found for GRI, SASB, or TCFD
**Cause:** Framework disclosure templates must be loaded via the ESG module setup; they are not auto-populated
**Solution:** Navigate to ESG Management > Frameworks in the ServiceNow UI and import the relevant framework templates.

## Examples

### Example 1: Monthly Utility Invoice Processing

**Scenario:** Sustainability analyst processes monthly electricity and gas invoices

```
Tool: SN-Create-Record
Parameters:
  table_name: sn_esg_data_point
  fields:
    metric: [electricity_metric_sys_id]
    value: 125400
    date: 2026-02-28
    source_document: "ConEd Invoice #INV-2026-0228 - HQ Building"
    location: [hq_location_sys_id]
    verified: false
    notes: "125,400 kWh. Rate: $0.14/kWh. Total: $17,556. Demand charge: 450 kW peak."
```

**Result:** Data point recorded, Scope 2 emissions auto-calculated at 48.4 metric tons CO2e.

### Example 2: Annual CDP Disclosure Preparation

**Scenario:** ESG manager needs to identify gaps in CDP Climate Change questionnaire

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_esg_disclosure
  query: framework.nameLIKECDP^reporting_period=2025^status!=complete
  fields: disclosure_id,short_description,status,response,evidence
  limit: 100
```

**Result:** 14 of 82 CDP disclosures incomplete. Critical gaps: Scope 3 Category 6 (Business Travel), Scope 3 Category 7 (Employee Commuting), Climate-related targets validation.

## Related Skills

- `grc/issue-summarization` - GRC issue analysis for ESG compliance findings
- `grc/risk-assessment-summarization` - Climate risk assessment analysis
- `grc/regulatory-alert-analysis` - ESG regulatory change tracking
- `document/document-extraction` - Extract data from utility invoices and reports
- `reporting/executive-dashboard` - Build ESG executive dashboards
