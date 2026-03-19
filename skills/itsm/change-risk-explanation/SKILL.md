---
name: change-risk-explanation
version: 1.0.0
description: Generate change request risk explanations analyzing change scope, affected CIs, historical change failure rates, and deployment window risks
author: Happy Technologies LLC
tags: [itsm, change, risk, assessment, explanation, ci, failure-rate, deployment, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Read-Record
    - SN-Update-Record
    - SN-NL-Search
  rest:
    - /api/now/table/change_request
    - /api/now/table/task_ci
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/change_task
    - /api/now/table/sys_journal_field
    - /api/now/table/risk
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# Change Risk Explanation Generation

## Overview

This skill covers generating comprehensive risk explanations for ServiceNow change requests:

- Analyzing change scope to assess breadth of impact (number of CIs, services, users affected)
- Evaluating affected configuration items and their criticality tiers
- Calculating historical change failure rates for similar changes and affected CIs
- Assessing deployment window risks including timing, maintenance windows, and business cycles
- Generating human-readable risk narratives for CAB review and approval workflows
- Providing risk mitigation recommendations based on identified risk factors

**When to use:** When preparing change requests for CAB review, when automated risk assessment needs human-readable explanations, when change managers need to justify risk ratings, or when stakeholders request risk impact summaries.

## Prerequisites

- **Roles:** `change_manager`, `itil`, or `admin`
- **Plugins:** `com.snc.change_management` (Change Management), `com.snc.cmdb` (CMDB)
- **Access:** Read access to `change_request`, `task_ci`, `cmdb_ci`, `cmdb_rel_ci` tables
- **Data:** Change request with populated CI relationships and change plan
- **Related Skills:** `itsm/change-management` for change lifecycle, `cmdb/impact-analysis` for CI impact analysis

## Procedure

### Step 1: Retrieve Change Request Details

Pull the change request record with all risk-relevant fields.

**MCP Approach:**
```
Tool: SN-Read-Record
Parameters:
  table_name: change_request
  sys_id: [CHG_SYS_ID]
  fields: sys_id,number,short_description,description,type,category,risk,impact,priority,state,start_date,end_date,planned_start_date,planned_end_date,change_plan,backout_plan,test_plan,assignment_group,assigned_to,requested_by,cmdb_ci,business_service,risk_impact_analysis,conflict_status,conflict_last_run,cab_required,scope,implementation_plan
```

**REST Approach:**
```
GET /api/now/table/change_request/[CHG_SYS_ID]
  ?sysparm_fields=sys_id,number,short_description,description,type,category,risk,impact,priority,state,start_date,end_date,planned_start_date,planned_end_date,change_plan,backout_plan,test_plan,assignment_group,assigned_to,cmdb_ci,business_service,risk_impact_analysis,scope
  &sysparm_display_value=true
```

### Step 2: Identify Affected Configuration Items

Retrieve all CIs associated with the change request.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_ci
  query: task=[CHG_SYS_ID]
  fields: sys_id,ci_item,ci_item.name,ci_item.sys_class_name,ci_item.operational_status,ci_item.busines_criticality
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/task_ci
  ?sysparm_query=task=[CHG_SYS_ID]
  &sysparm_fields=sys_id,ci_item
  &sysparm_display_value=true
```

For each affected CI, get its details:
```
Tool: SN-Read-Record
Parameters:
  table_name: cmdb_ci
  sys_id: [CI_SYS_ID]
  fields: sys_id,name,sys_class_name,operational_status,busines_criticality,environment,support_group,location,used_for,managed_by
```

### Step 3: Analyze CI Relationships and Blast Radius

Determine the downstream impact of changes to affected CIs.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[CI_SYS_ID]^type.name=Depends on::Used by
  fields: sys_id,parent,child,type,child.name,child.sys_class_name,child.busines_criticality
  limit: 100
```

**REST Approach:**
```
GET /api/now/table/cmdb_rel_ci
  ?sysparm_query=parent=[CI_SYS_ID]^type.name=Depends on::Used by
  &sysparm_fields=sys_id,parent,child,type
  &sysparm_display_value=true
```

Build the blast radius assessment:

```
BLAST RADIUS ANALYSIS:

Directly Affected CIs: [count]
  Tier 1 (Critical): [count]
  Tier 2 (High): [count]
  Tier 3 (Medium/Low): [count]

Downstream Dependencies: [count]
  Services Affected: [list]
  Users Potentially Impacted: [estimated count]
  Business Processes: [list]
```

### Step 4: Calculate Historical Change Failure Rate

Query past changes on the same CIs or category to assess failure probability.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: cmdb_ci=[CI_SYS_ID]^state=closed^sys_created_on>=javascript:gs.monthsAgo(12)
  fields: sys_id,number,close_code,state,risk,category,type
  limit: 100
```

```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: category=[SAME_CATEGORY]^state=closed^sys_created_on>=javascript:gs.monthsAgo(12)
  fields: sys_id,number,close_code,state,risk
  limit: 200
```

**Failure Rate Calculation:**

| Metric | Formula | Risk Level |
|--------|---------|------------|
| CI Failure Rate | Failed changes on CI / Total changes on CI | >20% = High, 10-20% = Medium, <10% = Low |
| Category Failure Rate | Failed changes in category / Total in category | >15% = High, 5-15% = Medium, <5% = Low |
| Team Failure Rate | Failed changes by team / Total by team | >10% = High, 5-10% = Medium, <5% = Low |
| Recent Trend | Failures in last 3 months vs prior 9 months | Increasing = Higher risk |

```
HISTORICAL CHANGE ANALYSIS:

Changes on [CI Name] (Last 12 Months):
Total: [count] | Successful: [count] | Failed: [count] | Failure Rate: [%]

Changes in [Category] (Last 12 Months):
Total: [count] | Successful: [count] | Failed: [count] | Failure Rate: [%]

Recent Failures on Same CI:
- [CHG#] ([date]): [short description] - [failure reason]
- [CHG#] ([date]): [short description] - [failure reason]
```

### Step 5: Assess Deployment Window Risk

Evaluate the timing and window of the planned change.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: planned_start_date>=javascript:gs.daysAgo(-7)^planned_start_dateONNext 7 days@javascript:gs.beginningOfToday()@javascript:gs.endOfNext(new GlideDateTime(), 7)^state!=closed^state!=canceled
  fields: sys_id,number,short_description,planned_start_date,planned_end_date,cmdb_ci,conflict_status
  limit: 50
```

**Window Risk Factors:**

| Factor | Low Risk | Medium Risk | High Risk |
|--------|----------|-------------|-----------|
| Time of Day | Maintenance window (2-6 AM) | Off-peak hours | Business hours |
| Day of Week | Saturday/Sunday | Tue-Thu | Monday/Friday |
| Business Calendar | Normal period | Month-end adjacent | Month/Quarter/Year end |
| Change Freeze | No freeze | Approaching freeze | During freeze period |
| Concurrent Changes | None planned | 1-2 low-risk | Multiple or conflicting |
| Rollback Window | >4 hours available | 2-4 hours | <2 hours |

### Step 6: Evaluate Change Plan Completeness

Assess whether the change plan, test plan, and backout plan are adequate.

```
PLAN COMPLETENESS ASSESSMENT:

Change Plan:
- [ ] Step-by-step implementation instructions: [Present/Missing]
- [ ] Estimated duration per step: [Present/Missing]
- [ ] Responsible parties identified: [Present/Missing]
- [ ] Pre-implementation checklist: [Present/Missing]
- [ ] Communication plan: [Present/Missing]

Test Plan:
- [ ] Test scenarios defined: [Present/Missing]
- [ ] Expected results documented: [Present/Missing]
- [ ] Test environment specified: [Present/Missing]
- [ ] Validation steps after implementation: [Present/Missing]

Backout Plan:
- [ ] Rollback procedure documented: [Present/Missing]
- [ ] Rollback time estimate: [Present/Missing]
- [ ] Data backup strategy: [Present/Missing]
- [ ] Go/No-Go decision criteria: [Present/Missing]
- [ ] Escalation contacts: [Present/Missing]

COMPLETENESS SCORE: [X/14] items present
```

### Step 7: Generate Risk Score

Calculate an overall risk score based on all factors.

```
RISK SCORING MODEL:

| Factor | Weight | Score (1-5) | Weighted |
|--------|--------|-------------|----------|
| CI Criticality | 25% | [score] | [weighted] |
| Blast Radius | 20% | [score] | [weighted] |
| Historical Failure Rate | 20% | [score] | [weighted] |
| Deployment Window | 15% | [score] | [weighted] |
| Plan Completeness | 10% | [score] | [weighted] |
| Change Complexity | 10% | [score] | [weighted] |
|                  |      | TOTAL: | [sum] |

RISK LEVEL:
1.0-2.0: Low Risk (Standard change candidate)
2.1-3.0: Moderate Risk (Normal change approval)
3.1-4.0: High Risk (CAB review required)
4.1-5.0: Critical Risk (Executive approval required)

CALCULATED RISK: [score] - [LEVEL]
```

### Step 8: Generate Risk Explanation Narrative

Compile everything into a human-readable risk explanation.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [CHG_SYS_ID]
  data:
    risk_impact_analysis: |
      CHANGE RISK ASSESSMENT: [CHG Number]
      Overall Risk: [HIGH/MODERATE/LOW] (Score: [X]/5.0)
      Generated: [date]

      EXECUTIVE SUMMARY:
      This change request involves [brief scope description] affecting [count]
      configuration items including [critical CI names]. The primary risk factors
      are [top 2-3 risk factors]. Historical data shows a [X]% failure rate for
      similar changes on these systems. The proposed deployment window
      [supports/raises concerns about] successful implementation.

      SCOPE ANALYSIS:
      The change directly affects [count] CIs across [count] services.
      [Count] of these are classified as Tier 1 (business critical).
      Downstream dependency analysis identifies [count] additional CIs
      that could be impacted if the change causes unexpected behavior.
      Estimated user impact: [count] users across [departments/locations].

      HISTORICAL RISK:
      Over the past 12 months, [count] similar changes have been executed
      on the affected systems with a [X]% success rate. Notable failures:
      - [CHG#] ([date]): [brief failure description and root cause]
      [If failure rate is high]: This elevated failure rate warrants
      additional testing and a robust backout plan.

      DEPLOYMENT WINDOW ASSESSMENT:
      The planned window ([date/time range]) [is within/falls outside]
      the standard maintenance window. [Count] concurrent changes are
      scheduled. The available rollback window is [duration].
      [Specific timing risks if any].

      PLAN ASSESSMENT:
      [Assessment of change plan, test plan, and backout plan completeness]
      [Specific gaps or concerns identified]

      RISK MITIGATION RECOMMENDATIONS:
      1. [Recommendation based on highest risk factor]
      2. [Recommendation for deployment approach]
      3. [Recommendation for monitoring/validation]
      4. [Recommendation for communication]

      APPROVAL RECOMMENDATION:
      [Recommend approval / Recommend approval with conditions / Recommend deferral]
      [Conditions if applicable]
```

### Step 9: Attach Risk Details to Change Tasks

Document specific risks against individual change tasks.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_task
  query: change_request=[CHG_SYS_ID]^ORDERBYplanned_start_date
  fields: sys_id,number,short_description,state,planned_start_date,planned_end_date,assigned_to
  limit: 20
```

For high-risk tasks, add risk notes:
```
Tool: SN-Update-Record
Parameters:
  table_name: change_task
  sys_id: [TASK_SYS_ID]
  data:
    work_notes: |
      RISK NOTE: This task involves [specific risk].
      Mitigation: [specific mitigation step].
      Rollback trigger: If [condition], execute backout plan step [X].
```

### Step 10: Create Risk Record if Needed

For high-risk changes, create a formal risk record.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: risk
  data:
    task: [CHG_SYS_ID]
    short_description: "Change failure risk for [CHG Number] affecting [Critical CI]"
    category: "Operational"
    probability: [1-5]
    impact: [1-5]
    response: "mitigate"
    mitigation_plan: "[Specific mitigation actions]"
    assigned_to: [CHANGE_MANAGER_SYS_ID]
    state: "open"
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Retrieve CIs, historical changes, relationships | Data collection and analysis |
| SN-Read-Record | Get change request and CI details | Detailed record inspection |
| SN-Update-Record | Write risk explanation to change record | Documenting risk assessment |
| SN-NL-Search | Find similar past changes by description | Pattern matching for failure analysis |

## Best Practices

1. **Base risk on data, not assumptions** -- use historical failure rates and actual CI criticality
2. **Include blast radius analysis** -- a change to one CI can cascade through dependencies
3. **Consider business context** -- the same change has different risk during quarter-end vs mid-quarter
4. **Recommend mitigations, not just risks** -- every identified risk should have a proposed mitigation
5. **Assess plan quality** -- incomplete backout plans significantly increase risk
6. **Check for change collisions** -- concurrent changes on related CIs compound risk
7. **Account for team experience** -- first-time changes on unfamiliar systems carry higher risk
8. **Document assumptions** -- state what data was used and any gaps in the analysis
9. **Update risk as change evolves** -- re-assess when scope, timing, or CIs change
10. **Use consistent scoring** -- apply the same risk model across all changes for comparability

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No CI relationships found | CIs not associated with change request | Check `task_ci` table; CIs may need to be manually linked |
| Historical data insufficient | CI is new or rarely changed | Use category-level failure rates instead; note data limitation in assessment |
| Conflict detection not run | Conflict analysis not triggered | Run conflict detection manually or check `conflict_last_run` timestamp |
| Risk score seems too low | Critical factors not weighted properly | Review scoring weights; verify CI criticality data is accurate |
| Blast radius too large | CI has excessive relationships in CMDB | Filter to direct dependencies only; exclude monitoring and discovery relationships |
| Change plan field empty | Change plan in attachments not record fields | Check attachments; extract plan content for assessment |

## Examples

### Example 1: Database Upgrade Risk Explanation

**Change:** Upgrade Oracle database from 19c to 21c on production ERP server.

```
RISK ASSESSMENT: CHG0045678
Overall Risk: HIGH (Score: 3.8/5.0)

KEY FACTORS:
- Tier 1 CI (ERP Database) serving 2,500 users
- 3 downstream application dependencies
- 2 prior database upgrades on this CI: 1 successful, 1 rolled back (50% failure rate)
- 4-hour deployment window with 2-hour rollback window
- Change scheduled during month-end processing period

RECOMMENDATION: Defer to post-month-end window. If timeline is fixed,
add DBA on standby and extend maintenance window to 6 hours.
```

### Example 2: Network Switch Firmware Update

**Change:** Update firmware on access layer switches in Building C.

```
RISK ASSESSMENT: CHG0045702
Overall Risk: LOW (Score: 1.6/5.0)

KEY FACTORS:
- Tier 3 CIs (access switches), 150 users affected
- Same firmware update applied to 12 switches last month with 100% success
- Scheduled during maintenance window (Sunday 2-6 AM)
- Automated rollback available via TFTP backup config
- No concurrent changes in network domain

RECOMMENDATION: Approve as standard change. No additional mitigations needed.
```

## Related Skills

- `itsm/change-management` - Full change management lifecycle
- `cmdb/impact-analysis` - CI impact and dependency analysis
- `cmdb/relationship-mapping` - CMDB relationship discovery
- `itsm/major-incident` - Major incident management (if change fails)
- `reporting/trend-analysis` - Change success/failure trend analysis
