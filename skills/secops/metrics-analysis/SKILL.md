---
name: metrics-analysis
version: 1.0.0
description: Analyze security operations metrics including MTTD, MTTR, incident volume trends, false positive rates, and analyst workload distribution
author: Happy Technologies LLC
tags: [secops, metrics, MTTD, MTTR, KPI, analytics, performance, soc-metrics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sn_si_task
    - /api/now/table/sn_ti_observable
    - /api/now/table/sn_vul_vulnerable_item
    - /api/now/table/sys_audit
    - /api/now/stats/sn_si_incident
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Security Operations Metrics Analysis

## Overview

This skill provides a structured approach to analyzing key security operations metrics in ServiceNow. It enables SOC managers and analysts to measure detection and response effectiveness, identify trends, and optimize resource allocation.

Key capabilities:
- Calculate Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR) across incident populations
- Track incident volume trends by category, priority, and time period
- Measure false positive rates and their impact on analyst productivity
- Analyze analyst workload distribution and identify bottlenecks
- Benchmark current performance against historical baselines and industry targets
- Generate metrics dashboards and reports for management review

**When to use:** During periodic SOC performance reviews (weekly, monthly, quarterly), management reporting, capacity planning, or when optimizing detection and response processes.

## Prerequisites

- **Roles:** `sn_si.manager`, `sn_si.admin`, `report_admin`
- **Access:** Read access to `sn_si_incident`, `sn_si_task`, `sn_ti_observable`, `sys_audit` tables; access to Aggregate API
- **Plugins:** Security Incident Response (sn_si), Performance Analytics (optional but recommended)
- **Data:** Sufficient incident history (minimum 30 days recommended for trend analysis)

## Procedure

### Step 1: Calculate Incident Volume by Period

Query incident counts by time period to establish volume trends.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,category,subcategory,priority,state,opened_at,resolved_at,closed_at,close_code,assignment_group
  limit: 1000
```

**Using REST (Aggregate API for counts):**
```
GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_count=true&sysparm_group_by=category

GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_count=true&sysparm_group_by=priority
```

### Step 2: Calculate Mean Time to Detect (MTTD)

MTTD measures the elapsed time between when a threat first appears and when it is detected. Use observable `first_seen` timestamps compared to incident `opened_at`.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('sn_si_incident');
    gr.addQuery('opened_at', '>=', gs.daysAgo(30));
    gr.addQuery('state', 'IN', '6,7'); // resolved or closed
    gr.query();
    var totalDetectTime = 0;
    var count = 0;
    while (gr.next()) {
      var obs = new GlideRecord('sn_ti_observable');
      obs.addQuery('security_incident', gr.sys_id);
      obs.orderBy('first_seen');
      obs.setLimit(1);
      obs.query();
      if (obs.next() && obs.first_seen) {
        var firstSeen = new GlideDateTime(obs.first_seen);
        var opened = new GlideDateTime(gr.opened_at);
        var diff = GlideDateTime.subtract(firstSeen, opened);
        totalDetectTime += diff.getNumericValue();
        count++;
      }
    }
    var avgMs = count > 0 ? totalDetectTime / count : 0;
    var avgHours = (avgMs / 3600000).toFixed(2);
    gs.info('MTTD: ' + avgHours + ' hours (based on ' + count + ' incidents)');
```

**Using REST (manual calculation):**
```
GET /api/now/table/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^stateIN6,7&sysparm_fields=sys_id,number,opened_at,resolved_at&sysparm_limit=500

# For each incident, query earliest observable:
GET /api/now/table/sn_ti_observable?sysparm_query=security_incident=[SYS_ID]^ORDERBYfirst_seen&sysparm_fields=first_seen&sysparm_limit=1
```

### Step 3: Calculate Mean Time to Respond (MTTR)

MTTR measures elapsed time from incident creation to resolution.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('sn_si_incident');
    gr.addQuery('opened_at', '>=', gs.daysAgo(30));
    gr.addQuery('resolved_at', '!=', '');
    gr.query();
    var totalResponseTime = 0;
    var count = 0;
    while (gr.next()) {
      var opened = new GlideDateTime(gr.opened_at);
      var resolved = new GlideDateTime(gr.resolved_at);
      var diff = GlideDateTime.subtract(opened, resolved);
      totalResponseTime += diff.getNumericValue();
      count++;
    }
    var avgMs = count > 0 ? totalResponseTime / count : 0;
    var avgHours = (avgMs / 3600000).toFixed(2);
    gs.info('MTTR: ' + avgHours + ' hours (based on ' + count + ' incidents)');
```

**Using REST (Aggregate API):**
```
GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^resolved_atISNOTEMPTY&sysparm_avg_fields=business_duration&sysparm_count=true
```

### Step 4: Measure False Positive Rate

Calculate the percentage of incidents closed as false positives or non-incidents.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^close_code=false_positive
  fields: sys_id,number,category,subcategory,assignment_group,closed_at
  limit: 500
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id
  limit: 1
```

**Using REST:**
```
# Total closed incidents
GET /api/now/stats/sn_si_incident?sysparm_query=closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_count=true

# False positives
GET /api/now/stats/sn_si_incident?sysparm_query=closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^close_code=false_positive&sysparm_count=true
```

### Step 5: Analyze Analyst Workload Distribution

Measure incident distribution across analysts and assignment groups.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^assigned_toISNOTEMPTY
  fields: assigned_to,assignment_group,priority,state
  limit: 1000
```

**Using REST (Aggregate API):**
```
GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^assigned_toISNOTEMPTY&sysparm_count=true&sysparm_group_by=assigned_to

GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_count=true&sysparm_group_by=assignment_group
```

### Step 6: Track Incident Category Trends

Identify shifts in attack types over time by comparing category distributions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: opened_atONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,category,subcategory,priority,opened_at
  limit: 2000
```

**Using REST:**
```
# Current month
GET /api/now/stats/sn_si_incident?sysparm_query=opened_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_count=true&sysparm_group_by=category

# Previous month
GET /api/now/stats/sn_si_incident?sysparm_query=opened_atBETWEENjavascript:gs.daysAgoStart(60)@javascript:gs.daysAgoEnd(30)&sysparm_count=true&sysparm_group_by=category
```

### Step 7: Measure Task Completion Efficiency

Analyze how quickly security incident tasks are completed.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_task
  query: closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,short_description,state,priority,assigned_to,opened_at,closed_at,work_duration
  limit: 500
```

**Using REST:**
```
GET /api/now/stats/sn_si_task?sysparm_query=closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_avg_fields=work_duration&sysparm_count=true&sysparm_group_by=priority
```

### Step 8: Compile Metrics Report

Generate a comprehensive metrics summary.

```
=== SECURITY OPERATIONS METRICS REPORT ===
Period: 2026-02-19 to 2026-03-19 (30 days)
Generated: 2026-03-19

VOLUME METRICS:
Total Incidents: 156 (prev period: 142, +9.8%)
  - Critical/P1: 4 (2.6%)
  - High/P2: 18 (11.5%)
  - Medium/P3: 67 (42.9%)
  - Low/P4: 67 (42.9%)

By Category:
  - Phishing: 52 (33.3%) ↑ from 28.2%
  - Malware: 28 (17.9%) ↓ from 22.5%
  - Unauthorized Access: 24 (15.4%) → stable
  - Data Loss: 12 (7.7%) → stable
  - Vulnerability Exploit: 18 (11.5%) ↑ from 8.5%
  - Other: 22 (14.1%)

RESPONSE METRICS:
Mean Time to Detect (MTTD): 4.2 hours (target: <2h, prev: 5.1h)
Mean Time to Respond (MTTR): 18.6 hours (target: <24h, prev: 22.3h)
Mean Time to Contain (MTTC): 2.8 hours (target: <4h, prev: 3.5h)

QUALITY METRICS:
False Positive Rate: 23.1% (target: <20%, prev: 25.6%)
Reopened Incidents: 3 (1.9%)
Escalation Rate: 14.1%

WORKLOAD DISTRIBUTION:
| Analyst | Incidents | Avg Resolution | Utilization |
|---------|-----------|----------------|-------------|
| T. Williams | 32 | 14.2h | 85% |
| K. Chen | 28 | 16.8h | 78% |
| A. Johnson | 31 | 19.1h | 82% |
| M. Davis | 25 | 21.5h | 70% |
| L. Park | 22 | 15.3h | 65% |
| Unassigned | 18 | N/A | - |

KEY OBSERVATIONS:
1. MTTD improved 18% but still above 2-hour target
2. Phishing volume increasing - consider enhanced email filtering
3. False positive rate improving but above 20% threshold
4. Workload imbalance: T. Williams carrying 20% of all incidents
5. 18 unassigned incidents need immediate attention

RECOMMENDATIONS:
1. Tune phishing detection rules to reduce false positives
2. Rebalance workload: redistribute from T. Williams to L. Park
3. Investigate MTTD gap: review SIEM alert correlation rules
4. Staff augmentation may be needed if volume trend continues
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Query-Table | Retrieve incident and task records for metric calculation |
| SN-Execute-Background-Script | Run server-side scripts for complex metric calculations |
| SN-Add-Work-Notes | Document metrics findings on relevant records |

## Best Practices

- **Establish baselines** before setting targets; use 90 days of historical data minimum
- **Segment metrics by priority** since P1 and P4 incidents have vastly different acceptable response times
- **Track trends over time** rather than focusing on single-period snapshots
- **Automate data collection** using scheduled background scripts or Performance Analytics indicators
- **Exclude outliers** when calculating averages; a single month-long incident can skew MTTR significantly
- **Report false positive rates by source** to identify which detection rules need tuning
- **Align metrics with business outcomes** by connecting MTTD/MTTR to business impact duration
- **Review workload distribution monthly** to prevent analyst burnout and ensure equitable assignment

## Troubleshooting

### MTTD Calculation Returns Zero
**Cause:** No observables with `first_seen` timestamps are linked to incidents, or the timestamp predates the incident.
**Solution:** Verify that threat intelligence integrations are populating `first_seen` on observables. If `first_seen` is after `opened_at`, MTTD may be negative; use the incident `opened_at` as the detection time in those cases.

### Aggregate API Returns Unexpected Counts
**Cause:** Encoded queries may not match the expected date ranges, or display values differ from stored values.
**Solution:** Test the query in the ServiceNow UI list filter first. Ensure date formats match the instance timezone.

### Workload Metrics Show All Incidents as Unassigned
**Cause:** The `assigned_to` field may be cleared when incidents are resolved or closed.
**Solution:** Use `sys_audit` to find the last assigned analyst before closure, or query the `assigned_to` field with `sysparm_display_value=true` to get display names.

### Metrics Differ from Performance Analytics
**Cause:** PA indicators may use different data collection schedules, filters, or calculation methods.
**Solution:** Align your query filters with the PA indicator definitions. Check PA data collection job schedules and ensure they have run recently.

## Examples

**Example 1: Monthly SOC Performance Report**
1. Calculate 30-day incident volume: 156 total across all categories
2. Compute MTTD (4.2h), MTTR (18.6h), and MTTC (2.8h)
3. Determine false positive rate: 36 false positives out of 156 total (23.1%)
4. Analyze workload across 5 analysts and identify imbalance
5. Compare all metrics against previous period and targets
6. Generate report with trend arrows and recommendations

**Example 2: Quarterly Executive Dashboard**
1. Pull 90-day incident data segmented by month for trend charts
2. Calculate month-over-month MTTD improvement: 6.3h → 5.1h → 4.2h
3. Identify top 3 categories driving volume increase
4. Benchmark MTTR against industry average (24h for mid-size organizations)
5. Project staffing needs based on volume trend (+9.8%/month)
6. Present findings with recommended budget for additional analyst headcount

## Related Skills

- `secops/correlation-insights` - Measure correlation effectiveness as a detection metric
- `secops/incident-summarization` - Include metrics context in incident summaries
- `secops/post-incident-analysis` - Use PIR data to improve detection metrics
- `secops/shift-handover` - Include shift-level metrics in handover reports
- `reporting/trend-analysis` - General ServiceNow trend analysis techniques
