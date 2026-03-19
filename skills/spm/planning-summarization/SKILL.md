---
name: planning-summarization
version: 1.0.0
description: Summarize planning items, demand records, and portfolio decisions with executive summaries for planning meetings including key metrics and recommendations
author: Happy Technologies LLC
tags: [spm, planning, demand, portfolio, summarization, executive, meetings, decisions]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-NL-Search
    - SN-Aggregate
  rest:
    - /api/now/table/dm_demand
    - /api/now/table/pm_portfolio
    - /api/now/table/pm_program
    - /api/now/table/pm_project
    - /api/now/table/pm_project_task
    - /api/now/table/planned_task
    - /api/now/table/rm_sprint
    - /api/now/table/rm_story
    - /api/now/table/rm_release
    - /api/now/table/ast_contract
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Planning Summarization

## Overview

This skill provides a structured approach to summarizing planning activities across ServiceNow's Strategic Portfolio Management module. It covers:

- Aggregating demand records by status, priority, and business unit
- Summarizing portfolio investment decisions and funding allocations
- Generating sprint planning summaries with capacity and commitment data
- Creating release planning overviews with feature readiness status
- Producing executive meeting summaries with key metrics and recommendations
- Consolidating program-level status for steering committee reviews

**When to use:** When portfolio managers, program managers, or product owners need concise summaries of planning data for governance meetings, sprint planning, release readiness reviews, or executive briefings in ServiceNow SPM.

## Prerequisites

- **Plugins:** `com.snc.project` (Project Portfolio Management), `com.snc.sdlc.agile.2.0` (Agile Development 2.0)
- **Roles:** `demand_manager`, `portfolio_manager`, `project_manager`, `scrum_master`, or `program_manager`
- **Access:** Read access to `dm_demand`, `pm_portfolio`, `pm_program`, `pm_project`, `rm_sprint`, `rm_story`, `rm_release`, `planned_task` tables
- **Knowledge:** Understanding of demand management lifecycle, portfolio governance processes, and agile ceremonies

## Procedure

### Step 1: Summarize Demand Pipeline

Query demand records to understand the intake pipeline and pending decisions.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: dm_demand
  query: stateNOT IN-5,4,7^ORDERBYpriority
  fields: sys_id,number,short_description,state,priority,type,business_unit,requested_by,requested_for,estimated_cost,estimated_effort,strategic_alignment,score,due_date,assignment_group
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/dm_demand?sysparm_query=stateNOT IN-5,4,7^ORDERBYpriority&sysparm_fields=sys_id,number,short_description,state,priority,type,business_unit,requested_by,estimated_cost,estimated_effort,strategic_alignment,score,due_date,assignment_group&sysparm_limit=50&sysparm_display_value=true
```

Group demands by state for a pipeline overview:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: dm_demand
  query: state=1
  fields: sys_id,number,short_description,priority,type,business_unit,estimated_cost,score
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/dm_demand?sysparm_query=state=1&sysparm_fields=sys_id,number,short_description,priority,type,business_unit,estimated_cost,score&sysparm_limit=30&sysparm_display_value=true
```

Demand states reference:
| State Value | Label | Description |
|-------------|-------|-------------|
| -5 | Draft | Initial creation, incomplete |
| 1 | New | Submitted, awaiting screening |
| 2 | Screening | Under initial assessment |
| 3 | Qualified | Approved for further analysis |
| 10 | Assessment | Detailed business case review |
| 15 | Approved | Approved for funding/execution |
| 4 | Closed | Completed or rejected |
| 7 | Cancelled | Withdrawn from pipeline |

### Step 2: Assess Portfolio Allocation

Query the portfolio to understand investment distribution and remaining budget.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_portfolio
  query: state=2
  fields: sys_id,number,short_description,state,total_budget,allocated_budget,remaining_budget,portfolio_manager,fiscal_year,strategic_theme
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/pm_portfolio?sysparm_query=state=2&sysparm_fields=sys_id,number,short_description,state,total_budget,allocated_budget,remaining_budget,portfolio_manager,fiscal_year,strategic_theme&sysparm_limit=10&sysparm_display_value=true
```

Query projects within the portfolio for allocation breakdown:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: portfolio=[portfolio_sys_id]^stateNOT IN-5,4
  fields: sys_id,number,short_description,state,phase,budget_cost,actual_cost,percent_complete,health,priority,end_date,project_manager
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/pm_project?sysparm_query=portfolio=[portfolio_sys_id]^stateNOT IN-5,4&sysparm_fields=sys_id,number,short_description,state,phase,budget_cost,actual_cost,percent_complete,health,priority,end_date,project_manager&sysparm_limit=30&sysparm_display_value=true
```

### Step 3: Generate Sprint Planning Summary

For agile teams, summarize the sprint planning data including capacity and committed stories.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_sprint
  query: release.product.sys_id=[product_sys_id]^state=1
  fields: sys_id,number,short_description,start_date,end_date,capacity,story_points,state
  limit: 3
```

Query stories committed to the upcoming sprint:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: sprint=[sprint_sys_id]^ORDERBYpriority
  fields: sys_id,number,short_description,story_points,state,priority,epic,assigned_to,acceptance_criteria,blocked
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=sprint=[sprint_sys_id]^ORDERBYpriority&sysparm_fields=sys_id,number,short_description,story_points,state,priority,epic,assigned_to,acceptance_criteria,blocked&sysparm_limit=50&sysparm_display_value=true
```

### Step 4: Compile Release Readiness

Query the release and its associated features for readiness assessment.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_release
  query: product.sys_id=[product_sys_id]^state!=3^ORDERBYstart_date
  fields: sys_id,number,short_description,start_date,end_date,state,description
  limit: 5
```

Query stories in the release grouped by completion status:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: sprint.release=[release_sys_id]
  fields: sys_id,number,short_description,story_points,state,epic,sprint,blocked
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=sprint.release=[release_sys_id]&sysparm_fields=sys_id,number,short_description,story_points,state,epic,sprint,blocked&sysparm_limit=100&sysparm_display_value=true
```

### Step 5: Review Program Status

For program-level planning, aggregate across constituent projects.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pm_project
  query: program=[program_sys_id]^stateNOT IN-5,4
  fields: sys_id,number,short_description,state,phase,health,percent_complete,schedule_variance,budget_cost,actual_cost,end_date,project_manager,risk
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/pm_project?sysparm_query=program=[program_sys_id]^stateNOT IN-5,4&sysparm_fields=sys_id,number,short_description,state,phase,health,percent_complete,schedule_variance,budget_cost,actual_cost,end_date,project_manager,risk&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Review Contract Dependencies

Check active contracts that impact planning timelines or resource availability.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: ast_contract
  query: stateNOT IN-5,3,4^end_date>=javascript:gs.nowDateTime()^ORDERBYend_date
  fields: sys_id,number,short_description,state,vendor,start_date,end_date,contract_value,renewal_date,contract_type
  limit: 15
```

**Using REST API:**
```bash
GET /api/now/table/ast_contract?sysparm_query=stateNOT IN-5,3,4^end_date>=javascript:gs.nowDateTime()^ORDERBYend_date&sysparm_fields=sys_id,number,short_description,state,vendor,start_date,end_date,contract_value,renewal_date,contract_type&sysparm_limit=15&sysparm_display_value=true
```

### Step 7: Assemble Executive Planning Summary

Compile all data into a structured meeting summary:

```
=== PLANNING MEETING SUMMARY ===
Date: 2026-03-19 | Prepared for: Portfolio Governance Board

DEMAND PIPELINE:
  Total Active Demands: 24
  New (Awaiting Screening): 8
  In Screening: 5
  Qualified: 6
  In Assessment: 3
  Approved (Awaiting Funding): 2

  Top Demands by Strategic Score:
  1. DMD0045001 - AI-Powered Customer Analytics (Score: 92, Cost: $380K)
  2. DMD0045002 - Mobile Self-Service Portal (Score: 88, Cost: $220K)
  3. DMD0045003 - Data Center Consolidation (Score: 85, Cost: $1.2M)

  Demands by Business Unit:
  - Engineering: 9 demands ($2.1M estimated)
  - Sales: 7 demands ($890K estimated)
  - Operations: 5 demands ($1.4M estimated)
  - HR: 3 demands ($340K estimated)

PORTFOLIO STATUS:
  Portfolio: FY2026 Technology Investments
  Total Budget: $12,000,000
  Allocated: $9,400,000 (78.3%)
  Remaining: $2,600,000
  Active Projects: 14
  Health: Green (9) | Yellow (3) | Red (2)

SPRINT PLANNING SUMMARY (Team Alpha):
  Sprint: Sprint 2026-04-A (Apr 1-14)
  Capacity: 40 story points
  Committed: 37 story points (92.5% utilization)
  Stories: 12 committed (8 Enhancement, 3 Defect, 1 Spike)
  Blocked Stories: 1 (STY0014523 - awaiting API access)
  Acceptance Criteria Coverage: 11 of 12 stories (91.7%)

RELEASE READINESS - Release 2.4:
  Target Date: 2026-04-30
  Total Stories: 48
  Complete: 31 (64.6%)
  In Progress: 10 (20.8%)
  Not Started: 7 (14.6%)
  Story Points: 189 total, 121 completed
  Risk: MEDIUM - 7 stories unstarted with 6 weeks remaining

KEY DECISIONS NEEDED:
  1. Approve DMD0045001 (AI Analytics) - $380K, aligns with Strategy Theme A
  2. Determine go/no-go for Release 2.4 on April 30
  3. Reallocate $150K from completed PRJ0010038 to underfunded PRJ0010055

RECOMMENDATIONS:
  1. [APPROVE] DMD0045001 - Highest strategic score, budget available
  2. [DEFER] DMD0045003 - $1.2M exceeds remaining budget, defer to Q3
  3. [ESCALATE] 2 Red projects require executive intervention
  4. [PLAN] Schedule Release 2.4 go/no-go review for April 15
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query demands, projects, sprints, stories, releases, contracts |
| `SN-Read-Record` | Retrieve a single portfolio, program, or project record |
| `SN-NL-Search` | Natural language search for planning items (e.g., "find approved demands for engineering") |
| `SN-Aggregate` | Calculate totals, averages, and counts across planning records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/dm_demand` | GET | Query demand pipeline and intake records |
| `/api/now/table/pm_portfolio` | GET | Portfolio budget and investment data |
| `/api/now/table/pm_program` | GET | Program-level status aggregation |
| `/api/now/table/pm_project` | GET | Project status and financial data |
| `/api/now/table/rm_sprint` | GET | Sprint planning and capacity data |
| `/api/now/table/rm_story` | GET | Story commitment and completion status |
| `/api/now/table/rm_release` | GET | Release planning and readiness data |
| `/api/now/table/ast_contract` | GET | Contract timelines and dependencies |
| `/api/now/table/planned_task` | GET | Planned task data for schedule analysis |

## Best Practices

- **Prepare Before Meetings:** Generate summaries at least 1 hour before governance meetings to allow review time
- **Include Decision Points:** Every summary should clearly state what decisions are needed from the audience
- **Show Trends:** Compare current metrics against the previous period to highlight improvements or deterioration
- **Use Strategic Alignment Scores:** When presenting demands, always include strategic alignment to guide prioritization
- **Separate Facts from Recommendations:** Clearly distinguish data-driven observations from subjective recommendations
- **Limit Scope per Summary:** Focus on one planning context (portfolio, program, sprint, or release) per summary to avoid information overload
- **Track Decisions:** Record meeting outcomes as updates on demand or project records for audit trail
- **Validate Budget Data:** Cross-check portfolio budget figures against finance systems before presenting to executives

## Troubleshooting

### "Demand records not showing expected fields"

**Cause:** Custom demand forms may have different field names or additional fields
**Solution:** Query `sys_dictionary` with `name=dm_demand` to discover the actual field names in your instance. Check for custom fields prefixed with `u_`.

### "Portfolio budget does not match project sum"

**Cause:** Not all projects may be linked to the portfolio, or some projects span multiple portfolios
**Solution:** Verify each project's `portfolio` field. Also check for demands approved but not yet converted to projects.

### "Sprint capacity shows zero"

**Cause:** Capacity may need to be manually set or calculated from team member availability
**Solution:** Check the sprint record's `capacity` field. If blank, calculate from team availability: number of team members multiplied by average velocity per person.

### "Release stories count is incomplete"

**Cause:** Stories may be linked to sprints in the release but not directly to the release itself
**Solution:** Query stories via `sprint.release=[release_sys_id]` rather than a direct release field on the story.

## Examples

### Example 1: Quarterly Portfolio Review Summary

**Scenario:** Prepare a summary for the Q2 portfolio governance board meeting.

```
Tool: SN-Query-Table
Parameters:
  table_name: pm_portfolio
  query: short_descriptionLIKEFY2026^state=2
  fields: sys_id,number,short_description,total_budget,allocated_budget,remaining_budget,portfolio_manager
  limit: 5
```

**Output:**
```
Q2 2026 PORTFOLIO REVIEW
Portfolio: FY2026 Technology Investments

INVESTMENT SUMMARY:
  Total Budget: $12.0M | Allocated: $9.4M | Available: $2.6M
  Projects Active: 14 | Completing This Quarter: 3 | Starting: 2

QUARTER HIGHLIGHTS:
  - 3 projects on track for Q2 completion (PRJ0010038, PRJ0010041, PRJ0010044)
  - 2 new projects approved from demand pipeline (DMD0045005, DMD0045008)
  - Net budget savings of $340K from completed projects

DEMAND BACKLOG:
  - 5 qualified demands awaiting funding ($1.8M total estimated cost)
  - 2 high-priority demands can be funded from remaining budget

PROPOSED Q2 ACTIONS:
  1. Fund DMD0045001 AI Analytics ($380K from available budget)
  2. Defer DMD0045003 Data Center Consolidation to FY2027 planning
  3. Reallocate $340K savings to PRJ0010055 API Gateway (currently underfunded)
```

### Example 2: Sprint Planning Pre-Read

```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: sprint.short_description=Sprint 2026-04-A^product.sys_id=[product_sys_id]
  fields: number,short_description,story_points,state,priority,assigned_to,blocked,acceptance_criteria
  limit: 30
```

**Output:**
```
SPRINT PLANNING PRE-READ
Sprint: 2026-04-A (Apr 1-14) | Team: Alpha
Velocity (3-sprint avg): 34 pts | Capacity: 40 pts

PROPOSED COMMITMENT (37 pts):
  P1 - Must Have:
    STY0014520 - Payment retry logic (8 pts, assigned: Dev A)
    STY0014521 - Invoice PDF generation (5 pts, assigned: Dev B)
    STY0014522 - Email notification templates (3 pts, assigned: Dev C)

  P2 - Should Have:
    STY0014523 - Third-party API integration (8 pts, BLOCKED - awaiting access)
    STY0014524 - Dashboard widget for sales (5 pts, assigned: Dev A)
    STY0014525 - Bulk export functionality (3 pts, assigned: Dev D)

  P3 - Nice to Have:
    STY0014526 - UI polish for settings page (2 pts, assigned: Dev C)
    STY0014527 - Logging improvements (3 pts, assigned: Dev B)

RISKS:
  - STY0014523 blocked on vendor API credentials (escalated Mar 15)
  - Dev D at 80% capacity due to support rotation

READINESS CHECKLIST:
  [YES] All P1 stories have acceptance criteria
  [YES] No unresolved dependencies for P1 stories
  [NO]  STY0014523 still blocked - may need to swap with backlog item
  [YES] Team capacity confirmed with all members
```

## Related Skills

- `spm/agile-story-generation` - Generate user stories from requirements
- `spm/acceptance-criteria` - Write acceptance criteria for stories
- `spm/project-insights` - Project health and performance metrics
- `spm/feedback-summarization` - Retrospective and feedback analysis
- `reporting/executive-dashboard` - Build executive dashboards
