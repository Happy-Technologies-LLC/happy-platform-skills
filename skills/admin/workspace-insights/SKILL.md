---
name: workspace-insights
version: 1.0.0
description: Workplace service delivery insights including space utilization, service request patterns, facility management metrics, and desk booking analytics
author: Happy Technologies LLC
tags: [admin, workplace, facilities, space-utilization, desk-booking, service-delivery, analytics, wsd]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
  rest:
    - /api/now/table/wsd_space
    - /api/now/table/wsd_reservation
    - /api/now/table/wsd_floor
    - /api/now/table/wsd_building
    - /api/now/table/fm_facility_request
    - /api/now/table/sc_req_item
    - /api/now/table/incident
    - /api/now/table/cmn_location
    - /api/now/table/task_sla
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 20-40 minutes
---

# Workplace Service Delivery Insights

## Overview

This skill covers generating insights and analytics for Workplace Service Delivery (WSD) in ServiceNow:

- Analyzing space utilization rates across buildings, floors, and zones
- Tracking desk and room booking patterns to optimize space allocation
- Monitoring facility management service request volumes, categories, and SLA compliance
- Identifying peak usage periods and underutilized spaces for capacity planning
- Generating facility management KPI dashboards with trend analysis
- Producing actionable recommendations for workplace optimization

**When to use:** When reviewing workplace space efficiency, planning office reconfigurations, analyzing facility service delivery performance, optimizing hot-desking strategies, or preparing workplace analytics for real estate decisions.

## Prerequisites

- **Roles:** `wsd_admin`, `facility_manager`, `admin`, or `workspace_admin`
- **Plugins:** `com.snc.workplace_service_delivery` (Workplace Service Delivery), `com.snc.facility_management` (Facility Management) recommended
- **Access:** Read access to `wsd_space`, `wsd_reservation`, `wsd_floor`, `wsd_building`, `fm_facility_request`, `sc_req_item` tables
- **Data:** Active workplace spaces with reservation and sensor data
- **Related Skills:** `reporting/executive-dashboard` for dashboard creation, `reporting/trend-analysis` for trend analytics

## Procedure

### Step 1: Retrieve Building and Floor Inventory

Establish the baseline of available workspace inventory.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_building
  query: active=true
  fields: sys_id,name,location,total_floors,total_capacity,address,time_zone,operational_status
  limit: 50
```

```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_floor
  query: building=[BUILDING_SYS_ID]^active=true
  fields: sys_id,name,building,floor_number,total_spaces,available_spaces,floor_plan
  limit: 20
```

**REST Approach:**
```
GET /api/now/table/wsd_building
  ?sysparm_query=active=true
  &sysparm_fields=sys_id,name,location,total_floors,total_capacity,address,time_zone,operational_status
  &sysparm_display_value=true

GET /api/now/table/wsd_floor
  ?sysparm_query=building=[BUILDING_SYS_ID]^active=true
  &sysparm_fields=sys_id,name,building,floor_number,total_spaces,available_spaces
  &sysparm_display_value=true
```

### Step 2: Analyze Space Utilization

Query space records to calculate utilization metrics.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_space
  query: floor.building=[BUILDING_SYS_ID]^active=true
  fields: sys_id,name,space_type,capacity,floor,is_reservable,status,amenities
  limit: 500
```

**Space Type Classification:**

| Space Type | Typical Capacity | Bookable | Metrics Focus |
|-----------|-----------------|----------|---------------|
| Desk | 1 | Yes | Occupancy rate, booking frequency |
| Meeting Room | 2-20 | Yes | Booking rate, no-show rate, avg duration |
| Phone Booth | 1 | Yes | Utilization rate, peak hours |
| Collaboration Zone | 4-12 | Sometimes | Foot traffic, usage duration |
| Hot Desk | 1 | Yes | Daily booking rate, user diversity |
| Private Office | 1-2 | No | Assignment vs actual presence |

### Step 3: Analyze Reservation Patterns

Query booking data to identify usage patterns.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_reservation
  query: space.floor.building=[BUILDING_SYS_ID]^start_date>=javascript:gs.daysAgo(30)^ORDERBYstart_date
  fields: sys_id,space,user,start_date,end_date,state,check_in_time,check_out_time,no_show,duration
  limit: 2000
```

**REST Approach:**
```
GET /api/now/table/wsd_reservation
  ?sysparm_query=space.floor.building=[BUILDING_SYS_ID]^start_date>=javascript:gs.daysAgo(30)
  &sysparm_fields=sys_id,space,user,start_date,end_date,state,check_in_time,check_out_time,no_show,duration
  &sysparm_limit=2000
  &sysparm_display_value=true
```

**Key Metrics to Calculate:**

| Metric | Formula | Target |
|--------|---------|--------|
| Booking Rate | Booked hours / Available hours | >60% |
| No-Show Rate | No-show reservations / Total reservations | <15% |
| Peak Utilization | Max concurrent bookings / Total capacity | Track trend |
| Avg Booking Duration | Sum of durations / Count of bookings | Varies by type |
| Unique Users/Week | Distinct users with bookings per week | Track growth |
| Advance Booking Lead | Avg days between creation and start | 1-3 days typical |

### Step 4: Identify Peak and Off-Peak Patterns

Analyze time-based usage patterns for capacity planning.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_reservation
  query: space.floor.building=[BUILDING_SYS_ID]^start_date>=javascript:gs.daysAgo(30)^state=completed
  fields: start_date,end_date,space.space_type,space.floor
  limit: 5000
```

Aggregate by day of week and hour to build a heatmap:

```
=== UTILIZATION HEATMAP ===
Building: [name]
Period: Last 30 days

         Mon   Tue   Wed   Thu   Fri
08:00    35%   42%   68%   55%   28%
09:00    62%   71%   88%   78%   45%
10:00    78%   85%   95%   89%   52%
11:00    82%   88%   97%   91%   48%
12:00    45%   52%   60%   55%   30%
13:00    70%   78%   92%   82%   42%
14:00    75%   82%   90%   85%   38%
15:00    68%   72%   85%   78%   32%
16:00    45%   50%   62%   52%   22%
17:00    20%   25%   30%   25%   10%

PEAK: Wednesday 11:00 (97%)
LOW: Friday 17:00 (10%)
```

### Step 5: Analyze Facility Service Requests

Review facility management request patterns.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: fm_facility_request
  query: sys_created_on>=javascript:gs.daysAgo(30)
  fields: sys_id,number,category,subcategory,priority,state,location,assignment_group,opened_at,closed_at,close_code
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/fm_facility_request
  ?sysparm_query=sys_created_on>=javascript:gs.daysAgo(30)
  &sysparm_fields=sys_id,number,category,subcategory,priority,state,location,assignment_group,opened_at,closed_at,close_code
  &sysparm_limit=500
  &sysparm_display_value=true
```

### Step 6: Check SLA Compliance for Facility Services

Measure service delivery performance against SLA targets.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task.sys_class_name=fm_facility_request^sys_created_on>=javascript:gs.daysAgo(30)
  fields: sys_id,task,sla,stage,has_breached,planned_end_time,percentage,business_percentage
  limit: 500
```

Calculate SLA metrics:

| SLA Category | Total | Met | Breached | Compliance |
|-------------|-------|-----|----------|------------|
| Cleaning | [n] | [n] | [n] | [%] |
| Maintenance | [n] | [n] | [n] | [%] |
| HVAC | [n] | [n] | [n] | [%] |
| Security | [n] | [n] | [n] | [%] |

### Step 7: Analyze Workplace Incidents

Review facility-related incidents for recurring issues.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: category=facilities^sys_created_on>=javascript:gs.daysAgo(30)
  fields: sys_id,number,short_description,category,subcategory,priority,state,location,assignment_group,opened_at,resolved_at
  limit: 200
```

### Step 8: Generate Workplace Insights Report

Compile all analytics into an actionable insights report.

```
=== WORKPLACE SERVICE DELIVERY INSIGHTS ===
Report Period: [start_date] - [end_date]
Scope: [Building/Campus/All Locations]

SPACE INVENTORY:
Buildings: [count] | Floors: [count] | Total Spaces: [count]
Desks: [count] | Meeting Rooms: [count] | Phone Booths: [count]

UTILIZATION SUMMARY:
Overall Space Utilization: [%]
  Desks: [%] | Meeting Rooms: [%] | Phone Booths: [%]
Peak Day: [day] ([%]) | Lowest Day: [day] ([%])
Peak Hour: [time] ([%]) | Lowest Hour: [time] ([%])

BOOKING ANALYTICS:
Total Reservations (30 days): [count]
Unique Users: [count]
Avg Daily Bookings: [count]
No-Show Rate: [%] ([count] no-shows)
Avg Booking Duration: [hours]
Most Popular Spaces: [list top 5]
Least Used Spaces: [list bottom 5]

FACILITY SERVICE METRICS:
Total Requests (30 days): [count]
Open: [count] | In Progress: [count] | Closed: [count]
Avg Resolution Time: [hours/days]
SLA Compliance: [%]

TOP REQUEST CATEGORIES:
| Category | Volume | Avg Resolution | SLA Met |
|----------|--------|---------------|---------|
| [category] | [count] | [time] | [%] |

FACILITY INCIDENTS:
Total: [count] | Recurring: [count]
Top Issues: [list]

RECOMMENDATIONS:
1. [Space optimization recommendation based on utilization data]
2. [No-show reduction strategy based on booking patterns]
3. [Service improvement recommendation based on SLA data]
4. [Capacity planning recommendation based on peak analysis]
5. [Cost optimization based on underutilized spaces]
```

### Step 9: Generate Desk Booking Analytics

Deep-dive into hot-desking and desk booking metrics.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_reservation
  query: space.space_type=desk^start_date>=javascript:gs.daysAgo(30)
  fields: sys_id,space,user,start_date,state,no_show,space.floor,space.floor.building
  limit: 2000
```

```
=== DESK BOOKING ANALYTICS ===
Total Desk Reservations: [count]
Unique Desk Users: [count]
Avg Desks Booked/Day: [count] of [total] ([%])

USER PATTERNS:
- Regular Bookers (>3x/week): [count] users
- Occasional (1-2x/week): [count] users
- Rare (<1x/week): [count] users

FLOOR-LEVEL BREAKDOWN:
| Floor | Desks | Avg Utilization | No-Show Rate |
|-------|-------|----------------|--------------|
| [floor] | [count] | [%] | [%] |

NO-SHOW ANALYSIS:
Total No-Shows: [count] ([%] of bookings)
Cost of No-Shows: ~$[estimated wasted space cost]
Top No-Show Times: [pattern]
Recommendation: [auto-release policy suggestion]
```

### Step 10: Generate Trend Analysis

Compare current period metrics against previous periods.

```
=== TREND ANALYSIS ===
Metric Comparison: Current Month vs Previous Month

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| Overall Utilization | [%] | [%] | [+/-]% |
| Daily Bookings | [avg] | [avg] | [+/-]% |
| No-Show Rate | [%] | [%] | [+/-]% |
| Facility Requests | [count] | [count] | [+/-]% |
| SLA Compliance | [%] | [%] | [+/-]% |
| Unique Users | [count] | [count] | [+/-]% |

TRENDS:
- Space utilization [increasing/decreasing/stable] over past 3 months
- [Day] consistently the busiest day ([%] avg utilization)
- Meeting room demand [exceeding/meeting/below] capacity
- Facility service SLA compliance [improving/declining]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Retrieve space, reservation, and request data | Primary data collection |
| SN-Read-Record | Get specific building or space details | Detailed record inspection |
| SN-NL-Search | Find spaces or requests by description | Exploratory search |

## Best Practices

1. **Analyze at least 30 days of data** for meaningful utilization patterns
2. **Exclude holidays and closures** from utilization calculations to avoid skewing metrics
3. **Segment by space type** -- desks, meeting rooms, and booths have different utilization benchmarks
4. **Include no-show analysis** -- no-shows represent significant waste in hot-desking environments
5. **Correlate with headcount** -- utilization should be measured against actual employee count, not total capacity
6. **Consider hybrid work patterns** -- Monday/Friday typically have lower utilization in hybrid environments
7. **Track trends over time** -- single-point metrics are less valuable than trends
8. **Include cost context** -- translate underutilization into dollar impact for stakeholders
9. **Factor in amenities** -- spaces with better amenities typically show higher utilization
10. **Benchmark across locations** -- compare similar buildings to identify best practices

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No reservation data found | WSD module not configured or reservations in different table | Check if `wsd_reservation` or `sn_wsd_rsv_reservation` is the active table |
| Utilization seems too low | Calculation includes non-bookable spaces | Filter to `is_reservable=true` spaces only |
| No-show data not tracked | Check-in feature not enabled | Enable check-in on space reservations; no-show detection requires check-in |
| Facility requests missing | Requests may be in `sc_req_item` not `fm_facility_request` | Query `sc_req_item` with `cat_item.category=facilities` |
| SLA data unavailable | SLAs not configured for facility requests | Verify SLA definitions exist for the `fm_facility_request` table |
| Building data incomplete | Location hierarchy not fully configured | Check `cmn_location` records and building-floor-space relationships |

## Examples

### Example 1: Monthly Workplace Report for Real Estate Team

**Scenario:** Generate monthly space utilization report for real estate planning.

```
Tool: SN-Query-Table
Parameters:
  table_name: wsd_reservation
  query: start_date>=javascript:gs.beginningOfLastMonth()^start_dateONLast month@javascript:gs.beginningOfLastMonth()@javascript:gs.endOfLastMonth()
  fields: space,user,start_date,state,no_show,space.space_type,space.floor.building
  limit: 5000
```

**Output:**
```
MONTHLY WORKPLACE REPORT - February 2026
Headquarters Campus

Overall Utilization: 67% (up from 61% in January)
Peak Day: Wednesday at 89% capacity
Underutilized Floors: Building B, Floors 4-5 (32% avg)

RECOMMENDATION: Consolidate Building B floors 4-5 to reduce
leased space by 15,000 sq ft. Estimated annual savings: $450K.
```

### Example 2: Facility Service Performance Review

**Scenario:** Generate quarterly facility service delivery scorecard.

```
FACILITY SERVICES SCORECARD - Q1 2026
Total Requests: 1,247
SLA Compliance: 94.2% (target: 95%)

BY CATEGORY:
- Cleaning: 412 requests, 97% SLA met
- Maintenance: 298 requests, 91% SLA met (BELOW TARGET)
- HVAC: 187 requests, 93% SLA met
- Security: 156 requests, 98% SLA met
- Other: 194 requests, 92% SLA met

ACTION: Maintenance SLA below target due to parts procurement delays.
Recommend pre-stocking common replacement parts at each building.
```

## Related Skills

- `reporting/executive-dashboard` - Build executive dashboards for workplace metrics
- `reporting/trend-analysis` - Advanced trend analysis for facility data
- `reporting/sla-analysis` - Detailed SLA compliance analysis
- `admin/instance-management` - Instance configuration for WSD module
