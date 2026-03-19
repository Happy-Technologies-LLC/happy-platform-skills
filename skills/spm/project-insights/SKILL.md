---
name: project-insights
version: 1.0.0
description: Generate project health insights including schedule variance, resource utilization, risk indicators, milestone tracking, and executive dashboard summaries
author: Happy Technologies LLC
tags: [spm, project, insights, health, dashboard, schedule, resources, milestones, risk]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
    - SN-Aggregate
  rest:
    - /api/now/table/pm_project
    - /api/now/table/pm_project_task
    - /api/now/table/planned_task
    - /api/now/table/pm_portfolio
    - /api/now/table/pm_program
    - /api/now/table/pm_resource_plan
    - /api/now/table/rm_story
    - /api/now/table/rm_sprint
    - /api/now/table/risk
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Project Insights

## Overview

This skill enables you to generate comprehensive project health insights from ServiceNow's Strategic Portfolio Management (SPM) module. It covers:

- Analyzing schedule variance and timeline adherence across project tasks
- Measuring resource utilization against planned allocations
- Identifying risk indicators and potential blockers
- Tracking milestone completion and upcoming deadlines
- Calculating agile velocity and sprint burndown metrics
- Producing executive dashboard summaries with actionable recommendations

**When to use:** When project managers, PMO leaders, or executives need a data-driven assessment of project health, portfolio status, or sprint performance in ServiceNow SPM.

## Prerequisites

- **Plugins:** `com.snc.project` (Project Portfolio Management), `com.snc.sdlc.agile.2.0` (Agile Development 2.0)
- **Roles:** `project_manager`, `program_manager`, `portfolio_manager`, or `admin`
- **Access:** Read access to `pm_project`, `pm_project_task`, `planned_task`, `pm_resource_plan`, `rm_story`, `rm_sprint`, `risk` tables
- **Knowledge:** Understanding of project scheduling concepts (critical path, EVM) and agile metrics (velocity, burndown)

## Procedure

### Step 1: Retrieve Project Overview

Fetch the core project record and its current status.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: pm_project
  sys_id: [project_sys_id]
  fields: sys_id,number,short_description,description,state,phase,priority,risk,percent_complete,start_date,end_date,actual_start_date,actual_end_date,work_start,work_end,schedule_variance,cost_variance,budget_cost,actual_cost,project_manager,program,portfolio,business_unit,health,health_reason
```

If you only have the project number:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: number=PRJ0010001
  fields: sys_id,number,short_description,state,phase,percent_complete,start_date,end_date,actual_start_date,schedule_variance,cost_variance,budget_cost,actual_cost,project_manager,health,risk
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/pm_project?sysparm_query=number=PRJ0010001&sysparm_fields=sys_id,number,short_description,state,phase,percent_complete,start_date,end_date,actual_start_date,schedule_variance,cost_variance,budget_cost,actual_cost,project_manager,health,risk&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Analyze Schedule Variance

Query project tasks to identify overdue, at-risk, and on-track items.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: parent=[project_sys_id]^stateNOT IN3,4,7^end_date<javascript:gs.nowDateTime()
  fields: sys_id,number,short_description,state,percent_complete,start_date,end_date,actual_start_date,actual_end_date,assigned_to,priority,milestone
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/pm_project_task?sysparm_query=parent=[project_sys_id]^stateNOT IN3,4,7^end_date<javascript:gs.nowDateTime()&sysparm_fields=sys_id,number,short_description,state,percent_complete,start_date,end_date,assigned_to,priority,milestone&sysparm_limit=50&sysparm_display_value=true
```

Query upcoming tasks due within the next 14 days:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: parent=[project_sys_id]^stateNOT IN3,4,7^end_date>=javascript:gs.nowDateTime()^end_date<=javascript:gs.daysAgoEnd(-14)
  fields: sys_id,number,short_description,state,percent_complete,end_date,assigned_to,priority,milestone
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/pm_project_task?sysparm_query=parent=[project_sys_id]^stateNOT IN3,4,7^end_date>=javascript:gs.nowDateTime()^end_date<=javascript:gs.daysAgoEnd(-14)&sysparm_fields=sys_id,number,short_description,state,percent_complete,end_date,assigned_to,priority&sysparm_limit=30&sysparm_display_value=true
```

### Step 3: Assess Resource Utilization

Query resource plans to understand allocation versus actual effort.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_resource_plan
  query: task=[project_sys_id]^state=2
  fields: sys_id,resource,planned_hours,actual_hours,remaining_hours,utilization,start_date,end_date,resource_type,group
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/pm_resource_plan?sysparm_query=task=[project_sys_id]^state=2&sysparm_fields=sys_id,resource,planned_hours,actual_hours,remaining_hours,utilization,start_date,end_date,resource_type,group&sysparm_limit=50&sysparm_display_value=true
```

Calculate utilization metrics:
- **Over-allocated:** Resources where `actual_hours > planned_hours`
- **Under-utilized:** Resources where `utilization < 50%`
- **At capacity:** Resources where utilization is between 80% and 100%

### Step 4: Review Risk Indicators

Query the risk table for project-specific risks and issues.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: risk
  query: task=[project_sys_id]^state!=6
  fields: sys_id,number,short_description,category,risk_score,probability,impact,state,response,assigned_to,due_date,mitigation_plan
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/risk?sysparm_query=task=[project_sys_id]^state!=6&sysparm_fields=sys_id,number,short_description,category,risk_score,probability,impact,state,response,assigned_to,due_date,mitigation_plan&sysparm_limit=20&sysparm_display_value=true
```

### Step 5: Track Milestones

Query milestone tasks to assess progress against key deliverables.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: parent=[project_sys_id]^milestone=true^ORDERBYend_date
  fields: sys_id,number,short_description,state,percent_complete,end_date,actual_end_date,assigned_to,priority
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/pm_project_task?sysparm_query=parent=[project_sys_id]^milestone=true^ORDERBYend_date&sysparm_fields=sys_id,number,short_description,state,percent_complete,end_date,actual_end_date,assigned_to,priority&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Gather Agile Metrics (If Applicable)

For projects using Agile methodology, query sprint and story data.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_sprint
  query: release.product.project=[project_sys_id]^state=3^ORDERBYDESCend_date
  fields: sys_id,number,short_description,start_date,end_date,story_points,capacity,state
  limit: 5
```

Query completed stories per sprint to calculate velocity:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: sprint=[sprint_sys_id]^state=3
  fields: sys_id,number,story_points,state,sprint
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=sprint=[sprint_sys_id]^state=3&sysparm_fields=sys_id,number,story_points,state&sysparm_limit=100
```

Calculate velocity: Sum of `story_points` for completed stories in each sprint. Average the last 3-5 sprints for a reliable velocity metric.

### Step 7: Compile the Executive Dashboard Summary

Assemble all collected data into a structured health report:

```
=== PROJECT HEALTH DASHBOARD ===
Project: PRJ0010001 - Cloud Migration Phase 2
Manager: Sarah Chen | Program: Digital Transformation
Phase: Execution | Health: [Green/Yellow/Red]

SCHEDULE PERFORMANCE:
  Planned End: 2026-06-30 | Projected End: 2026-07-15
  Schedule Variance: +15 days (at risk)
  Tasks Overdue: 4 of 32 (12.5%)
  Tasks Due Next 14 Days: 7
  Milestones Completed: 3 of 8 (37.5%)
  Next Milestone: "Integration Testing Complete" due 2026-04-01

COST PERFORMANCE:
  Budget: $450,000 | Actual Spend: $285,000 (63.3%)
  Cost Variance: -$12,000 (under budget)
  Burn Rate: $47,500/month
  Projected Total: $427,500

RESOURCE UTILIZATION:
  Total Resources: 12
  Over-allocated (>100%): 2 (John D. 120%, Maria S. 115%)
  Under-utilized (<50%): 1 (Alex K. 35%)
  Average Utilization: 82%

RISK SUMMARY:
  Open Risks: 5 (2 High, 2 Medium, 1 Low)
  Top Risk: "Vendor API deprecation" (Score: 16, Impact: High)
  Overdue Mitigations: 1

AGILE VELOCITY (Last 3 Sprints):
  Sprint 14: 34 pts | Sprint 15: 38 pts | Sprint 16: 31 pts
  Average Velocity: 34.3 pts/sprint
  Remaining Backlog: 142 pts
  Projected Sprints to Complete: 4.1 sprints

RECOMMENDATIONS:
  1. [URGENT] Address 4 overdue tasks blocking Integration Testing milestone
  2. [ACTION] Rebalance workload from John D. and Maria S. to Alex K.
  3. [MONITOR] Vendor API deprecation risk - mitigation plan overdue
  4. [PLAN] At current velocity, backlog completion extends 1 sprint beyond plan
```

### Step 8: Portfolio-Level Insights

For PMO leaders, aggregate project health across the portfolio.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: portfolio=[portfolio_sys_id]^stateNOT IN-5,3,4
  fields: sys_id,number,short_description,state,phase,health,percent_complete,schedule_variance,cost_variance,budget_cost,actual_cost,risk,project_manager,end_date
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/pm_project?sysparm_query=portfolio=[portfolio_sys_id]^stateNOT IN-5,3,4&sysparm_fields=sys_id,number,short_description,state,phase,health,percent_complete,schedule_variance,cost_variance,budget_cost,actual_cost,risk,project_manager,end_date&sysparm_limit=50&sysparm_display_value=true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Read-Record` | Retrieve a single project or task record by sys_id |
| `SN-Query-Table` | Query tasks, resources, risks, milestones, sprints, and stories |
| `SN-NL-Search` | Natural language search for projects (e.g., "find at-risk projects in Q2") |
| `SN-Aggregate` | Calculate counts, sums, and averages across project data |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/pm_project` | GET | Query project records and portfolio data |
| `/api/now/table/pm_project_task` | GET | Query tasks, milestones, schedule data |
| `/api/now/table/pm_resource_plan` | GET | Resource allocation and utilization |
| `/api/now/table/risk` | GET | Project risks and mitigations |
| `/api/now/table/rm_sprint` | GET | Sprint data for velocity calculations |
| `/api/now/table/rm_story` | GET | Story completion for burndown metrics |
| `/api/now/table/pm_portfolio` | GET | Portfolio-level aggregation |
| `/api/now/table/pm_program` | GET | Program-level project grouping |

## Best Practices

- **Use Display Values:** Always include `sysparm_display_value=true` in REST calls for readable output in dashboards
- **Calculate Earned Value:** Use `percent_complete * budget_cost` to derive earned value for EVM analysis
- **Trend Over Time:** Compare metrics across multiple reporting periods to identify trends, not just snapshots
- **Focus on Leading Indicators:** Prioritize velocity trends, upcoming milestones, and resource constraints over lagging metrics
- **Set Health Thresholds:** Define clear Green/Yellow/Red criteria (e.g., Green = schedule variance < 5 days, Yellow = 5-15 days, Red = >15 days)
- **Include Recommendations:** Raw data is insufficient; always provide actionable recommendations with urgency levels
- **Cross-Reference Risks:** Correlate overdue tasks with open risks to identify systemic issues
- **Validate Data Freshness:** Check `sys_updated_on` timestamps to ensure metrics reflect current state

## Troubleshooting

### "Project shows 0% complete despite finished tasks"

**Cause:** Percent complete may be calculated from planned duration, not task completion
**Solution:** Check the project's `percent_complete_method` field. Options include "manual," "task-based," and "duration-based." Verify task states are correctly updated.

### "Resource utilization numbers seem incorrect"

**Cause:** Resource plan records may not have actuals logged
**Solution:** Verify that time entries are being recorded against the project tasks. Check `actual_hours` on `pm_resource_plan` records.

### "No risk records found for the project"

**Cause:** Risks may be linked via the `task` field to project tasks rather than the project itself
**Solution:** Query with `task.parent=[project_sys_id]` to find risks linked to child tasks. Also check `risk_condition` for auto-generated risk records.

### "Sprint velocity data is inconsistent"

**Cause:** Stories may be moved between sprints or completed after sprint closure
**Solution:** Filter for stories where `sprint` matches the target sprint and `state=3` (Complete). Exclude stories moved out via `sprint_changed` field if available.

## Examples

### Example 1: Weekly Status Report for a Single Project

**Step 1 - Gather data:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: number=PRJ0010042
  fields: sys_id,number,short_description,state,phase,health,percent_complete,schedule_variance,budget_cost,actual_cost,project_manager,end_date
  limit: 1
```

**Step 2 - Get overdue tasks:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: parent=[sys_id]^state=2^end_date<javascript:gs.nowDateTime()
  fields: number,short_description,end_date,assigned_to,priority
  limit: 10
```

**Output:**
```
WEEKLY STATUS - PRJ0010042 ERP Upgrade
Report Date: 2026-03-19

Health: YELLOW | Phase: Testing | Complete: 72%
Schedule: 8 days behind plan | Budget: $12K under budget

KEY ISSUES:
- 3 overdue tasks in Integration Testing phase
- UAT environment provisioning delayed by vendor

MILESTONES:
  [DONE] Requirements Complete (Feb 15)
  [DONE] Development Complete (Mar 01)
  [LATE] Integration Testing (Due Mar 10, now projected Mar 22)
  [UPCOMING] UAT Sign-off (Due Apr 05)
  [UPCOMING] Go-Live (Due Apr 30)

ACTIONS NEEDED:
1. Escalate vendor environment issue to procurement
2. Add 2 QA resources for parallel testing
```

### Example 2: Portfolio Health Summary

```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: portfolio.short_description=Digital Transformation^stateNOT IN-5,3,4
  fields: number,short_description,health,percent_complete,schedule_variance,budget_cost,actual_cost,end_date,project_manager
  limit: 20
```

**Output:**
```
PORTFOLIO DASHBOARD - Digital Transformation
Active Projects: 8 | Total Budget: $3.2M

HEALTH DISTRIBUTION:
  Green: 5 projects (62.5%)
  Yellow: 2 projects (25.0%)
  Red: 1 project (12.5%)

AT-RISK PROJECTS:
  [RED] PRJ0010042 - ERP Upgrade (8 days behind, vendor dependency)
  [YELLOW] PRJ0010055 - API Gateway (resource constraints)
  [YELLOW] PRJ0010061 - Data Lake (scope change pending approval)

BUDGET SUMMARY:
  Allocated: $3,200,000
  Spent: $1,890,000 (59.1%)
  Projected: $3,050,000 (4.7% under budget)
```

## Related Skills

- `spm/agile-story-generation` - Generate and manage user stories
- `spm/planning-summarization` - Summarize planning sessions and portfolio decisions
- `spm/feedback-summarization` - Analyze retrospective and stakeholder feedback
- `reporting/executive-dashboard` - Build executive dashboards and visualizations
- `reporting/trend-analysis` - Trend analysis for project metrics over time
