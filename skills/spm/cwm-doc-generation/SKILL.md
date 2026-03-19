---
name: cwm-doc-generation
version: 1.0.0
description: Generate CWM documentation and insights from project data including status reports, risk summaries, and stakeholder communications
author: Happy Technologies LLC
tags: [spm, cwm, documentation, project, status-report, risk, stakeholder, portfolio]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
    - SN-Create-Record
  rest:
    - /api/now/table/pm_project
    - /api/now/table/pm_project_task
    - /api/now/table/planned_task
    - /api/now/table/pm_resource_plan
    - /api/now/table/pm_portfolio
    - /api/now/table/risk
    - /api/now/table/issue
    - /api/now/table/sys_journal_field
    - /api/now/table/pm_status_report
  native:
    - Bash
complexity: intermediate
estimated_time: 20-40 minutes
---

# CWM Documentation Generation

## Overview

This skill covers generating comprehensive Collaborative Work Management (CWM) documentation from ServiceNow project data:

- Creating automated project status reports with milestone progress, budget, and timeline health
- Generating risk summaries with impact assessments and mitigation plans
- Building stakeholder communications tailored to audience (executive, sponsor, team)
- Producing portfolio-level dashboards summarizing multiple project health indicators
- Extracting project insights from task data, resource allocation, and activity history
- Generating meeting-ready project update presentations

**When to use:** When preparing weekly/monthly status reports, communicating project health to stakeholders, summarizing portfolio status for leadership, or generating risk and issue digests.

## Prerequisites

- **Roles:** `project_manager`, `program_manager`, `portfolio_manager`, or `admin`
- **Plugins:** `com.snc.project_management` (Project Portfolio Management) or CWM workspace
- **Access:** Read access to `pm_project`, `pm_project_task`, `planned_task`, `risk`, `issue`, `pm_resource_plan` tables
- **Data:** Active projects with populated tasks, milestones, and status data
- **Related Skills:** `spm/cwm-tasks-generation` for task breakdown, `spm/project-insights` for analytics

## Procedure

### Step 1: Retrieve Project Overview Data

Pull the core project record with key health indicators.

**MCP Approach:**
```
Tool: SN-Read-Record
Parameters:
  table_name: pm_project
  sys_id: [PROJECT_SYS_ID]
  fields: sys_id,number,short_description,description,state,phase,priority,percent_complete,planned_start_date,planned_end_date,actual_start_date,actual_end_date,budget_cost,actual_cost,project_manager,sponsor,portfolio,program,health,schedule_health,cost_health,scope_health,resource_health
```

**REST Approach:**
```
GET /api/now/table/pm_project/[PROJECT_SYS_ID]
  ?sysparm_fields=sys_id,number,short_description,description,state,phase,priority,percent_complete,planned_start_date,planned_end_date,actual_start_date,actual_end_date,budget_cost,actual_cost,project_manager,sponsor,portfolio,program,health,schedule_health,cost_health,scope_health,resource_health
  &sysparm_display_value=true
```

### Step 2: Retrieve Milestone and Task Progress

Get milestone completion status and task progress metrics.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: project=[PROJECT_SYS_ID]^milestone=true^ORDERBYplanned_start_date
  fields: sys_id,number,short_description,state,percent_complete,planned_start_date,planned_end_date,actual_start_date,actual_end_date,assigned_to
  limit: 50
```

```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project_task
  query: project=[PROJECT_SYS_ID]
  fields: sys_id,state,percent_complete,priority
  limit: 500
```

**REST Approach:**
```
GET /api/now/table/pm_project_task
  ?sysparm_query=project=[PROJECT_SYS_ID]^milestone=true^ORDERBYplanned_start_date
  &sysparm_fields=sys_id,number,short_description,state,percent_complete,planned_start_date,planned_end_date,actual_start_date,actual_end_date,assigned_to
  &sysparm_display_value=true
```

### Step 3: Retrieve Risks and Issues

Pull active risks and issues associated with the project.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: risk
  query: task=[PROJECT_SYS_ID]^state!=closed
  fields: sys_id,number,short_description,category,probability,impact,risk_score,response,state,assigned_to,mitigation_plan
  limit: 30
```

```
Tool: SN-Query-Table
Parameters:
  table_name: issue
  query: task=[PROJECT_SYS_ID]^state!=closed
  fields: sys_id,number,short_description,priority,state,assigned_to,resolution,sys_created_on
  limit: 30
```

**REST Approach:**
```
GET /api/now/table/risk
  ?sysparm_query=task=[PROJECT_SYS_ID]^state!=closed
  &sysparm_fields=sys_id,number,short_description,category,probability,impact,risk_score,response,state,assigned_to,mitigation_plan
  &sysparm_display_value=true

GET /api/now/table/issue
  ?sysparm_query=task=[PROJECT_SYS_ID]^state!=closed
  &sysparm_fields=sys_id,number,short_description,priority,state,assigned_to,resolution,sys_created_on
  &sysparm_display_value=true
```

### Step 4: Retrieve Resource Allocation Data

Get resource plan information for capacity and utilization insights.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_resource_plan
  query: project=[PROJECT_SYS_ID]^state=active
  fields: sys_id,resource,role,planned_hours,actual_hours,remaining_hours,start_date,end_date,utilization
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/pm_resource_plan
  ?sysparm_query=project=[PROJECT_SYS_ID]^state=active
  &sysparm_fields=sys_id,resource,role,planned_hours,actual_hours,remaining_hours,start_date,end_date,utilization
  &sysparm_display_value=true
```

### Step 5: Generate Project Status Report

Compile all data into a structured status report.

```
=== PROJECT STATUS REPORT ===
Report Date: [current_date]
Project: [number] - [short_description]
Project Manager: [project_manager]
Phase: [phase] | State: [state]

OVERALL HEALTH: [health_indicator]
  Schedule: [schedule_health] | Cost: [cost_health]
  Scope: [scope_health] | Resources: [resource_health]

PROGRESS SUMMARY:
Percent Complete: [percent_complete]%
Planned Timeline: [planned_start] - [planned_end]
Actual Timeline: [actual_start] - [projected_end]
Schedule Variance: [days ahead/behind]

BUDGET STATUS:
Budget: $[budget_cost]
Actual Spend: $[actual_cost]
Remaining: $[budget - actual]
Cost Variance: [percentage]% [over/under]

MILESTONE STATUS:
| Milestone | Planned Date | Status | Variance |
|-----------|-------------|--------|----------|
| [name] | [date] | [on-track/at-risk/complete/late] | [days] |
| [name] | [date] | [status] | [days] |

TASK METRICS:
Total Tasks: [count] | Complete: [count] | In Progress: [count]
Overdue Tasks: [count] | Blocked: [count]

RISKS ([count] active):
| Risk | Probability | Impact | Score | Response |
|------|------------|--------|-------|----------|
| [description] | [H/M/L] | [H/M/L] | [score] | [mitigate/accept/transfer] |

ISSUES ([count] open):
| Issue | Priority | Owner | Status |
|-------|----------|-------|--------|
| [description] | [P1-P4] | [name] | [investigating/resolving] |

KEY ACCOMPLISHMENTS (This Period):
- [Accomplishment 1]
- [Accomplishment 2]

PLANNED ACTIVITIES (Next Period):
- [Activity 1]
- [Activity 2]

DECISIONS NEEDED:
- [Decision 1 with context]
```

### Step 6: Generate Executive Summary

Create a concise executive-level communication.

```
=== EXECUTIVE SUMMARY ===
Project: [name]
Status: [GREEN/YELLOW/RED]

HEADLINE: [One-sentence project status]

KEY METRICS:
- Progress: [%] complete ([ahead/behind] schedule by [days])
- Budget: $[actual] of $[budget] spent ([%] utilized)
- Next Milestone: [name] due [date] - [status]

TOP RISKS:
1. [Risk description] - Mitigation: [action]
2. [Risk description] - Mitigation: [action]

DECISIONS REQUIRED:
1. [Decision needed with recommendation]

FORECAST: [Project on track for [date] completion / Recommend [action] to recover schedule]
```

### Step 7: Generate Stakeholder Communication

Tailor communications for different audiences.

**Sponsor Update:**
```
Subject: [Project Name] - Status Update [Date]

Dear [Sponsor Name],

[One paragraph summary of project health and progress]

Key highlights this period:
- [Highlight 1]
- [Highlight 2]

Items requiring your attention:
- [Decision or escalation needed]

Next milestone: [name] targeted for [date].

Full status report attached for reference.
```

**Team Update:**
```
Subject: [Project Name] - Weekly Update [Date]

Team,

Progress this week:
- [Completed item 1]
- [Completed item 2]

Focus for next week:
- [Priority 1] - Owner: [name]
- [Priority 2] - Owner: [name]

Blockers:
- [Blocker description] - Need: [what is needed]

Reminders:
- [Upcoming deadline or meeting]
```

### Step 8: Generate Portfolio Summary

For portfolio-level reporting across multiple projects.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: portfolio=[PORTFOLIO_SYS_ID]^state=active
  fields: sys_id,number,short_description,health,percent_complete,schedule_health,cost_health,budget_cost,actual_cost,planned_end_date,project_manager
  limit: 50
```

```
=== PORTFOLIO STATUS SUMMARY ===
Portfolio: [name]
Report Date: [date]
Active Projects: [count]

HEALTH OVERVIEW:
Green: [count] | Yellow: [count] | Red: [count]

| Project | Health | Progress | Schedule | Budget | PM |
|---------|--------|----------|----------|--------|-----|
| [name] | [G/Y/R] | [%] | [on-track/late] | [$actual/$budget] | [name] |

PORTFOLIO BUDGET:
Total Budget: $[sum]
Total Spend: $[sum]
Overall Variance: [%]

ATTENTION REQUIRED:
- [Project X]: [issue requiring attention]
- [Project Y]: [risk or escalation]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Retrieve project tasks, risks, issues, resources | Data collection for reports |
| SN-Read-Record | Get detailed project record | Core project data retrieval |
| SN-NL-Search | Find projects by natural language description | Exploratory project lookup |
| SN-Create-Record | Create status report records in ServiceNow | Persisting generated reports |

## Best Practices

1. **Automate report generation** on a weekly cadence to maintain consistency
2. **Lead with health indicators** -- stakeholders want to know status at a glance
3. **Tailor depth to audience** -- executives need summaries, teams need details
4. **Highlight variances** -- focus on deviations from plan rather than restating the plan
5. **Include actionable items** -- every report should have clear next steps or decisions needed
6. **Use consistent formatting** -- standardize report templates across the portfolio
7. **Track report history** -- maintain status report records for trend analysis
8. **Validate data freshness** -- ensure task and milestone data is current before generating reports
9. **Flag stale projects** -- highlight projects with no activity in the past 2 weeks
10. **Include forecast** -- always project forward, not just report backward

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Health indicators blank | Health calculation not configured or not run | Trigger project health recalculation; check health rule configuration |
| Milestone dates missing | Milestones not flagged on tasks | Verify `milestone=true` is set on key project tasks |
| Budget data shows zero | Budget fields not populated on project record | Check `budget_cost` and `actual_cost` fields; may use separate financial tables |
| Resource data incomplete | Resource plans not created or not linked | Verify `pm_resource_plan` records exist for the project |
| Risk scores not calculated | Risk assessment not completed | Ensure probability and impact fields are populated on risk records |
| Portfolio query returns no projects | Projects not linked to portfolio | Check `portfolio` reference field on project records |

## Examples

### Example 1: Weekly Status Report

**Scenario:** Generate weekly status report for an ERP implementation project.

```
Tool: SN-Read-Record
Parameters:
  table_name: pm_project
  sys_id: abc123def456
  fields: number,short_description,health,percent_complete,schedule_health,cost_health,budget_cost,actual_cost,planned_end_date
```

**Generated Report:**
```
PROJECT STATUS - PRJ0010234: ERP Phase 2 Implementation
Week of March 15, 2026 | Health: YELLOW

Progress: 62% complete (target: 68%) - 6% behind plan
Budget: $1.2M of $2.0M spent (60%) - on track
Schedule: 8 business days behind due to vendor delay

MILESTONES:
- Data Migration Complete: Mar 10 - DONE
- UAT Start: Mar 22 - AT RISK (dependency on data validation)
- Go-Live: Apr 15 - AT RISK (cascading delay)

ACTION NEEDED: Approve additional vendor resources to recover schedule ($45K)
```

### Example 2: Executive Portfolio Briefing

**Scenario:** Generate monthly portfolio summary for CIO review.

```
PORTFOLIO: Digital Transformation 2026
12 Active Projects | Budget: $8.5M

Summary: 8 Green, 3 Yellow, 1 Red
Overall Portfolio Health: YELLOW

RED PROJECT: Cloud Migration Phase 3
- 3 weeks behind schedule
- Key risk: Legacy system dependencies
- Recommendation: Extend timeline by 2 weeks, add integration resources

BUDGET: $3.2M spent of $8.5M (38%) - on track for year
```

## Related Skills

- `spm/cwm-tasks-generation` - Generate task breakdowns from requirements
- `spm/project-insights` - Project analytics and trend analysis
- `spm/planning-summarization` - Summarize project planning data
- `spm/agile-story-generation` - Generate agile stories for project work
- `spm/acceptance-criteria` - Define acceptance criteria for deliverables
