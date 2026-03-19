---
name: health-safety-summarization
version: 1.0.0
description: Summarize Health and Safety incidents with injury details, root cause analysis, OSHA reporting requirements, corrective actions, and workplace hazard tracking
author: Happy Technologies LLC
tags: [hrsd, health-safety, incident, osha, injury, hazard, investigation, corrective-action, workplace-safety]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
    - SN-Read-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_hs_incident
    - /api/now/table/sn_hr_hs_hazard
    - /api/now/table/sn_hr_hs_investigation
    - /api/now/table/sn_hr_hs_corrective_action
    - /api/now/table/sn_hr_core_case
    - /api/now/table/cmn_location
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Health & Safety Incident Summarization

## Overview

This skill generates comprehensive summaries of Health and Safety (H&S) incidents within ServiceNow HR Service Delivery. It covers:

- Aggregating workplace incident data including injury type, severity, and body part affected
- Correlating incidents with root cause investigations and contributing hazards
- Determining OSHA recordability and reporting requirements (Form 300, 300A, 301)
- Tracking corrective actions and preventive measures through to completion
- Producing safety trend reports by location, department, incident type, and time period
- Generating executive safety dashboards for EHS leadership

**When to use:**
- Preparing monthly or quarterly safety performance reports
- After a workplace incident requiring investigation and root cause analysis
- During OSHA compliance audits requiring recordkeeping evidence
- When leadership needs a consolidated view of workplace safety posture
- Before safety committee meetings requiring incident trend data

## Prerequisites

- **Roles:** `sn_hr_hs.admin`, `sn_hr_hs.manager`, `sn_hr_core.manager`, or `admin`
- **Plugins:** `com.sn_hr_health_safety` (Health and Safety), `com.sn_hr_core` (HR Core)
- **Access:** Read access to sn_hr_hs_incident, sn_hr_hs_hazard, sn_hr_hs_investigation tables
- **Knowledge:** Understanding of OSHA recordkeeping requirements (29 CFR 1904), incident classification, and your organization's safety reporting protocols

## Key H&S Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sn_hr_hs_incident` | Workplace safety incidents | number, short_description, state, severity, incident_type, injury_type, body_part, location, incident_date, osha_recordable |
| `sn_hr_hs_hazard` | Workplace hazards | number, short_description, hazard_type, risk_level, location, state, control_measures |
| `sn_hr_hs_investigation` | Incident investigations | number, incident, root_cause, contributing_factors, findings, investigator, state |
| `sn_hr_hs_corrective_action` | Corrective and preventive actions | number, short_description, incident, action_type, state, owner, due_date, completion_date |
| `cmn_location` | Facility and location records | name, city, state, country, building, floor |

## Procedure

### Step 1: Retrieve H&S Incidents

Query recent workplace incidents sorted by severity.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_hs_incident
  query: active=true^ORDERBYDESCseverity
  fields: sys_id,number,short_description,description,state,severity,incident_type,injury_type,body_part,location,incident_date,osha_recordable,days_away,restricted_duty,assigned_to,opened_by,sys_created_on
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_hs_incident?sysparm_query=active=true^ORDERBYDESCseverity&sysparm_fields=sys_id,number,short_description,description,state,severity,incident_type,injury_type,body_part,location,incident_date,osha_recordable,days_away,restricted_duty&sysparm_limit=100&sysparm_display_value=true
```

### Step 2: Retrieve Investigation Details

For each incident, pull the root cause investigation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_hs_investigation
  query: incident=[incident_sys_id]
  fields: sys_id,number,root_cause,contributing_factors,findings,investigator,state,methodology,completion_date
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_hs_investigation?sysparm_query=incident=[incident_sys_id]&sysparm_fields=sys_id,number,root_cause,contributing_factors,findings,investigator,state,methodology&sysparm_limit=10&sysparm_display_value=true
```

### Step 3: Identify Related Hazards

Query hazards associated with the incident location or type.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_hs_hazard
  query: location=[incident_location]^active=true
  fields: sys_id,number,short_description,hazard_type,risk_level,location,state,control_measures,reported_date
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_hs_hazard?sysparm_query=location=[location_sys_id]^active=true&sysparm_fields=sys_id,number,short_description,hazard_type,risk_level,location,state,control_measures&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Track Corrective Actions

Query corrective and preventive actions for open incidents.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_hs_corrective_action
  query: incident=[incident_sys_id]
  fields: sys_id,number,short_description,action_type,state,owner,due_date,completion_date,effectiveness_review
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_hs_corrective_action?sysparm_query=incident=[incident_sys_id]&sysparm_fields=sys_id,number,short_description,action_type,state,owner,due_date,completion_date&sysparm_limit=20&sysparm_display_value=true
```

### Step 5: Generate Safety Performance Summary

**Build a comprehensive safety metrics report:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var summary = {
      generated_date: new GlideDateTime().toString(),
      incident_metrics: { total_ytd: 0, recordable: 0, lost_time: 0, restricted_duty: 0, first_aid: 0, near_miss: 0 },
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
      by_type: {},
      by_location: {},
      by_body_part: {},
      osha_metrics: { trir: 0, dart: 0, total_hours_worked: 0 },
      corrective_actions: { open: 0, overdue: 0, completed_ytd: 0 },
      hazards: { open: 0, critical: 0 }
    };

    var now = new GlideDateTime();
    var yearStart = new GlideDateTime(now.getYearUTC() + '-01-01 00:00:00');

    // Incident aggregation (YTD)
    var gr = new GlideRecord('sn_hr_hs_incident');
    gr.addQuery('incident_date', '>=', yearStart.toString());
    gr.query();
    while (gr.next()) {
      summary.incident_metrics.total_ytd++;

      if (gr.osha_recordable.toString() == 'true') summary.incident_metrics.recordable++;
      if (parseInt(gr.days_away.toString()) > 0) summary.incident_metrics.lost_time++;
      if (gr.restricted_duty.toString() == 'true') summary.incident_metrics.restricted_duty++;

      var sev = gr.severity.getDisplayValue() || 'Unknown';
      if (sev.match(/critical/i)) summary.by_severity.critical++;
      else if (sev.match(/high/i)) summary.by_severity.high++;
      else if (sev.match(/medium/i)) summary.by_severity.medium++;
      else summary.by_severity.low++;

      var iType = gr.incident_type.getDisplayValue() || 'Other';
      summary.by_type[iType] = (summary.by_type[iType] || 0) + 1;

      var loc = gr.location.getDisplayValue() || 'Unknown';
      summary.by_location[loc] = (summary.by_location[loc] || 0) + 1;

      var bodyPart = gr.body_part.getDisplayValue() || 'Not Specified';
      summary.by_body_part[bodyPart] = (summary.by_body_part[bodyPart] || 0) + 1;
    }

    // Open corrective actions
    var ca = new GlideAggregate('sn_hr_hs_corrective_action');
    ca.addQuery('active', true);
    ca.addAggregate('COUNT');
    ca.query();
    if (ca.next()) summary.corrective_actions.open = parseInt(ca.getAggregate('COUNT'));

    // Overdue corrective actions
    var overdueCa = new GlideAggregate('sn_hr_hs_corrective_action');
    overdueCa.addQuery('active', true);
    overdueCa.addQuery('due_date', '<', now.toString());
    overdueCa.addAggregate('COUNT');
    overdueCa.query();
    if (overdueCa.next()) summary.corrective_actions.overdue = parseInt(overdueCa.getAggregate('COUNT'));

    // Open hazards
    var hz = new GlideAggregate('sn_hr_hs_hazard');
    hz.addQuery('active', true);
    hz.addAggregate('COUNT');
    hz.query();
    if (hz.next()) summary.hazards.open = parseInt(hz.getAggregate('COUNT'));

    gs.info('SAFETY PERFORMANCE SUMMARY:\n' + JSON.stringify(summary, null, 2));
  description: "H&S: Generate YTD safety performance summary with OSHA metrics"
```

### Step 6: Determine OSHA Reporting Requirements

**Evaluate an incident against OSHA recordkeeping criteria:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var incNumber = 'HS0001234'; // Replace with target incident
    var gr = new GlideRecord('sn_hr_hs_incident');
    gr.addQuery('number', incNumber);
    gr.query();

    if (gr.next()) {
      var osha = {
        incident: gr.number.toString(),
        title: gr.short_description.toString(),
        incident_date: gr.incident_date.toString(),
        recordable: false,
        form_300_required: false,
        form_301_required: false,
        immediate_report_required: false,
        reporting_deadline: '',
        criteria_met: []
      };

      // OSHA recordability criteria (29 CFR 1904.7)
      var daysAway = parseInt(gr.days_away.toString()) || 0;
      var restrictedDuty = gr.restricted_duty.toString() == 'true';
      var injuryType = gr.injury_type.getDisplayValue().toLowerCase();

      if (daysAway > 0) { osha.criteria_met.push('Days away from work: ' + daysAway); osha.recordable = true; }
      if (restrictedDuty) { osha.criteria_met.push('Restricted duty/job transfer'); osha.recordable = true; }
      if (injuryType.match(/fracture|amputation|hospitalization|loss of consciousness/)) {
        osha.criteria_met.push('Significant injury: ' + injuryType);
        osha.recordable = true;
      }

      // Immediate reporting (29 CFR 1904.39): fatality within 8 hrs, amputation/eye loss/hospitalization within 24 hrs
      if (injuryType.match(/fatality|death/)) {
        osha.immediate_report_required = true;
        osha.reporting_deadline = '8 hours from employer knowledge';
      } else if (injuryType.match(/amputation|eye loss|hospitalization/)) {
        osha.immediate_report_required = true;
        osha.reporting_deadline = '24 hours from employer knowledge';
      }

      if (osha.recordable) {
        osha.form_300_required = true;
        osha.form_301_required = true;
      }

      gs.info('OSHA REPORTING ASSESSMENT:\n' + JSON.stringify(osha, null, 2));
    }
  description: "H&S: Evaluate OSHA recordability and reporting requirements"
```

## Tool Usage

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query Incidents | SN-Query-Table | GET /api/now/table/sn_hr_hs_incident |
| Search Incidents | SN-Natural-Language-Search | N/A |
| Query Investigations | SN-Query-Table | GET /api/now/table/sn_hr_hs_investigation |
| Query Hazards | SN-Query-Table | GET /api/now/table/sn_hr_hs_hazard |
| Query Corrective Actions | SN-Query-Table | GET /api/now/table/sn_hr_hs_corrective_action |
| Aggregate Analysis | SN-Execute-Background-Script | POST /api/now/table/sys_trigger |
| Schema Discovery | SN-Discover-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Timeliness:** Summarize incidents within 24 hours of occurrence for accurate root cause investigation
- **OSHA Compliance:** Always evaluate recordability criteria before closing an incident; missed records carry significant penalties
- **Root Cause Depth:** Ensure investigations go beyond proximate cause to identify systemic contributing factors
- **Corrective Action Tracking:** Set firm due dates and escalation paths for overdue corrective actions
- **Leading Indicators:** Include near-miss and hazard report counts alongside lagging indicators like TRIR and DART
- **Location Analysis:** Segment incident data by location to identify facilities with elevated risk profiles
- **Privacy Protection:** Redact personally identifiable injury details from executive summaries; use aggregate data only
- **Seasonal Trends:** Account for seasonal patterns (e.g., heat illness in summer, slip/fall in winter) when interpreting trends

## Troubleshooting

### Incident Type Field Returns Empty Values

**Symptom:** Incident type breakdowns show all items as "Other"
**Cause:** The `incident_type` field may use a custom choice list or a different field name
**Solution:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_hr_hs_incident
```
Check for fields like `type`, `category`, or `classification` that categorize incidents.

### OSHA Recordable Flag Not Set

**Symptom:** Incidents that meet recordability criteria show `osha_recordable` as false
**Cause:** Recordability determination may be a manual step or require a business rule trigger
**Solution:** Verify that business rules on `sn_hr_hs_incident` evaluate recordability criteria. Check if a separate OSHA log table exists.

### Investigation Records Not Linked

**Symptom:** Investigation query returns no results for a known incident
**Cause:** The relationship field may use `parent`, `source`, or a custom reference instead of `incident`
**Solution:** Query `sys_dictionary` for reference fields on `sn_hr_hs_investigation` that point to `sn_hr_hs_incident`.

## Examples

### Example 1: Monthly Safety Report

**Scenario:** EHS director needs a monthly safety summary for the safety committee

```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: sn_hr_hs_incident
  query: "all workplace incidents reported in the last 30 days including near misses and first aid cases"
  limit: 50
```

**Generated Summary:**
- **Total Incidents (March):** 12 (down from 15 in February)
- **OSHA Recordable:** 3 (TRIR: 2.1, down from 2.8)
- **Lost Time Cases:** 1 (slip and fall, warehouse, 5 days away)
- **Near Misses:** 4 (forklift proximity: 2, electrical: 1, chemical spill: 1)
- **Top Location:** Building A Warehouse (5 incidents, 42%)
- **Top Injury Type:** Strain/sprain (4 incidents)
- **Corrective Actions:** 8 open, 2 overdue
- **Recommendation:** Conduct focused safety stand-down at Building A Warehouse; prioritize 2 overdue corrective actions

### Example 2: Single Incident Deep Dive

**Scenario:** Investigation team needs a complete incident package for a serious injury

```
Tool: SN-Read-Record
Parameters:
  table_name: sn_hr_hs_incident
  sys_id: [incident_sys_id]
  fields: sys_id,number,short_description,description,severity,incident_type,injury_type,body_part,location,incident_date,osha_recordable,days_away,restricted_duty,root_cause,work_notes
```

**Generated Detail:**
- **Incident:** HS0001456 - Employee fall from elevated platform
- **Date:** 2026-03-15, 10:30 AM, Building C, Level 2
- **Severity:** High | OSHA Recordable: Yes
- **Injury:** Fractured wrist (right), 15 days away from work
- **Root Cause:** Missing guardrail on temporary work platform; fall protection not worn
- **Contributing Factors:** Inadequate pre-task safety inspection, expired fall protection training
- **Corrective Actions:** 3 assigned (guardrail installation, training refresh, inspection checklist update)
- **OSHA Reporting:** Form 300 and 301 required; no immediate reporting needed (not hospitalization/amputation/fatality)

## Related Skills

- `hrsd/case-summarization` - General HR case summarization
- `hrsd/sentiment-analysis` - Employee sentiment related to safety culture
- `grc/issue-summarization` - GRC issue analysis for safety compliance
- `security/audit-compliance` - Audit and compliance reporting
- `admin/workflow-creation` - Automate safety incident workflows
