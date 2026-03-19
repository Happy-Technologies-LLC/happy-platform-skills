---
name: playbook-recommendations
version: 1.0.0
description: Recommend relevant playbooks based on case or incident context by matching issue patterns to existing playbooks, scoring relevance, and suggesting customizations for better fit
author: Happy Technologies LLC
tags: [genai, playbooks, process-automation, recommendations, incident, case, pattern-matching, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-NL-Search
    - SN-Update-Record
  rest:
    - /api/now/table/sys_pd_playbook
    - /api/now/table/sys_pd_activity
    - /api/now/table/sys_pd_context
    - /api/now/table/incident
    - /api/now/table/sn_customerservice_case
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sys_pd_playbook_usage
    - /api/now/table/sys_pd_stage
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Playbook Recommendations

## Overview

This skill recommends relevant Process Automation Designer playbooks based on the context of an active case, incident, or HR case:

- Matching issue patterns (category, priority, symptoms) to existing playbook triggers and conditions
- Scoring playbook relevance based on historical success rates and contextual alignment
- Recommending specific playbooks with explanation of why they match
- Suggesting playbook customizations when no exact match exists
- Identifying gaps where new playbooks should be created
- Analyzing playbook execution history for effectiveness validation

**When to use:** When agents need guidance on which playbook to apply to an active record, when automating playbook selection in virtual agent flows, or when assessing playbook coverage across service categories.

## Prerequisites

- **Roles:** `process_automation_user`, `itil`, `sn_customerservice_agent`, or `admin`
- **Plugins:** `com.glide.process_automation` (Process Automation Designer)
- **Access:** Read access to `sys_pd_playbook`, `sys_pd_activity`, `sys_pd_context`, and source record tables
- **Knowledge:** Process Automation Designer concepts, playbook lifecycle, activity types
- **Related Skills:** `genai/playbook-generation` for creating new playbooks, `genai/flow-generation` for underlying flows

## Procedure

### Step 1: Retrieve the Source Record Context

Fetch the case or incident that needs a playbook recommendation.

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: <incident_sys_id>
  fields: sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,assignment_group,state,cmdb_ci,contact_type,caller_id
```

**REST Approach:**
```
GET /api/now/table/incident/<incident_sys_id>
  ?sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,impact,urgency,assignment_group,state,cmdb_ci,contact_type
  &sysparm_display_value=true
```

For CSM cases:
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: <case_sys_id>
  fields: sys_id,number,short_description,description,product,category,priority,account,contact,state,assignment_group
```

### Step 2: Query Available Playbooks

Retrieve all active playbooks that could apply to this record type.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_playbook
  query: active=true^trigger_table=incident^ORDERBYorder
  fields: sys_id,name,description,trigger_table,trigger_condition,category,sys_updated_on,active,application
  limit: 50
```

**REST Approach:**
```
GET /api/now/table/sys_pd_playbook
  ?sysparm_query=active=true^trigger_table=incident^ORDERBYorder
  &sysparm_fields=sys_id,name,description,trigger_table,trigger_condition,category,sys_updated_on
  &sysparm_display_value=true
  &sysparm_limit=50
```

### Step 3: Retrieve Playbook Activities and Stages

For each candidate playbook, understand what it does by fetching its stages and activities.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_stage
  query: playbook=<playbook_sys_id>^ORDERBYorder
  fields: sys_id,name,description,order,playbook,condition
  limit: 20
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_activity
  query: playbook=<playbook_sys_id>^ORDERBYorder
  fields: sys_id,name,description,activity_type,stage,order,condition,mandatory,inputs
  limit: 50
```

### Step 4: Match Playbooks to Record Context

Score each playbook against the source record using these criteria:

**Matching Criteria:**

| Criterion | Weight | How to Match |
|-----------|--------|-------------|
| Category match | 30% | Playbook trigger_condition includes record's category |
| Priority alignment | 15% | Playbook designed for this priority level |
| CI/Service match | 20% | Playbook targets the same CI type or service |
| Description similarity | 15% | NL similarity between record description and playbook description |
| Historical success | 20% | Playbook resolution rate for similar records |

**MCP Approach for historical matching:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_context
  query: playbook=<playbook_sys_id>^state=complete^ORDERBYDESCsys_created_on
  fields: sys_id,playbook,document_id,state,started,completed,duration
  limit: 50
```

### Step 5: Calculate Relevance Scores

Build a ranked list of playbook recommendations:

```
=== PLAYBOOK RECOMMENDATIONS ===
Record: INC0045678 - Email server not responding
Category: Email | Priority: P2 | CI: mail-server-prod-01

Rank | Playbook                        | Score | Match Reason
-----|---------------------------------|-------|------------------------------------------
#1   | Email Service Outage Response   | 92%   | Category: exact, CI type: mail server,
     |                                 |       | Success rate: 89% (45 past executions)
#2   | Server Connectivity Diagnostic  | 78%   | CI type: server, Description: "not
     |                                 |       | responding" pattern, Success: 76%
#3   | Network Service Restoration     | 65%   | Category: partial (network/email),
     |                                 |       | Priority: P2 match, Success: 82%
#4   | General Incident Triage         | 45%   | Generic fallback, always applicable,
     |                                 |       | Success: 71%

RECOMMENDED: #1 - Email Service Outage Response
Reason: Exact category match, designed for this CI type, 89% historical
success rate across 45 similar incidents.
```

### Step 6: Analyze Playbook Execution History

Check how the recommended playbook has performed historically.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_context
  query: playbook=<recommended_playbook_sys_id>^state=complete^completed>javascript:gs.daysAgo(90)
  fields: sys_id,document_id,state,started,completed,duration
  limit: 100
```

Calculate metrics:
```
=== PLAYBOOK PERFORMANCE: Email Service Outage Response ===
Period: Last 90 days

Executions: 45
Completion Rate: 89% (40 completed, 5 abandoned)
Average Duration: 32 minutes
Median Duration: 25 minutes
Fastest Resolution: 8 minutes
Slowest Resolution: 2 hours 15 minutes

Resolution Outcome (from linked incidents):
- Resolved: 38 (84%)
- Escalated: 5 (11%)
- Workaround Applied: 2 (5%)
```

### Step 7: Suggest Playbook Customizations

When no playbook is an exact match, recommend modifications to the closest match:

```
=== CUSTOMIZATION SUGGESTIONS ===
Closest Match: Server Connectivity Diagnostic (78% relevance)

Suggested Modifications for Email-Specific Use:
1. ADD STAGE: "Check Email Service Status"
   - Activity: Query monitoring system for mail server health
   - Activity: Check mail queue depth via REST API

2. MODIFY STAGE: "Connectivity Tests"
   - Add email-specific port checks (25, 587, 993, 143)
   - Add SMTP handshake test activity

3. ADD ACTIVITY: "Notify Email Users"
   - Send communication to affected distribution list
   - Post status update to service status page

4. SKIP STAGE: "Database Connectivity" (not applicable to email)

Estimated Effort to Customize: 2-4 hours
Alternative: Create new playbook using genai/playbook-generation skill
```

### Step 8: Identify Playbook Coverage Gaps

Find categories or incident types with no matching playbooks.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^sys_pd_contextISEMPTY^ORDERBYDESCsys_created_on
  fields: category,subcategory,priority,short_description
  limit: 100
```

Group by category to find unserved areas:
```
=== PLAYBOOK COVERAGE GAPS ===

| Category/Subcategory        | Open Incidents | Playbook Available |
|-----------------------------|---------------|-------------------|
| Hardware > Monitor Issues   | 23            | No                |
| Software > License Errors   | 18            | No                |
| Network > WiFi Connectivity | 15            | No                |
| Email > Calendar Sync       | 12            | No                |
| Database > Performance      | 8             | Yes (partial)     |

Priority Recommendation:
Create playbooks for "Hardware > Monitor Issues" and "Software > License Errors"
first (highest volume with no coverage).
```

### Step 9: Attach Playbook to Record (Optional)

If the recommendation is accepted, associate the playbook with the record.

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: <incident_sys_id>
  data:
    u_recommended_playbook: "<playbook_sys_id>"
    u_playbook_relevance_score: "92"
```

### Step 10: Track Recommendation Effectiveness

Monitor whether recommended playbooks lead to successful outcomes.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_pd_context
  query: document_id=<incident_sys_id>^state=complete
  fields: sys_id,playbook,state,started,completed,duration
  limit: 5
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Fetch playbooks, execution history, incidents | Primary data retrieval and analysis |
| SN-Get-Record | Retrieve specific incident or case details | Getting source record context |
| SN-NL-Search | Find playbooks by description similarity | When category matching is insufficient |
| SN-Update-Record | Link recommended playbook to record | Recording the recommendation |

## Best Practices

1. **Weight historical success heavily** -- a playbook with 90% completion rate is better than a perfect category match with poor execution
2. **Consider playbook complexity** -- recommend simpler playbooks for P1 incidents where speed matters
3. **Check playbook currency** -- playbooks not updated in 6+ months may reference outdated procedures
4. **Factor in agent skill level** -- some playbooks require advanced technical skills
5. **Provide fallback recommendations** -- always include a generic triage playbook as a safety net
6. **Track recommendation acceptance** -- measure how often agents follow recommendations
7. **Update scoring weights** -- tune match criteria based on actual outcome data
8. **Consider time-of-day** -- some playbooks require resources only available during business hours
9. **Avoid playbook overload** -- recommend 3-5 options maximum, ranked by relevance
10. **Include explanation** -- agents need to understand why a playbook is recommended

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No playbooks found | Wrong trigger_table or all inactive | Check `sys_pd_playbook.trigger_table` matches record type |
| All scores are low | Playbooks not aligned with current categories | Review and update playbook trigger conditions |
| Execution history empty | Playbooks recently created or never used | Fall back to category/description matching only |
| Recommendation mismatch | Scoring weights not calibrated | Analyze past recommendations vs outcomes, adjust weights |
| Context records missing | Process Automation tracking not enabled | Verify `sys_pd_context` records are being created |
| Playbook activities not returned | Activities use different table name | Check for `sys_pd_lane_activity` or version-specific table |

## Examples

### Example 1: Incident Playbook Recommendation

**Input:** "Recommend a playbook for INC0045678 - Email server not responding"

**Steps:** Retrieve incident details, query all active playbooks for incident table, score each against category/priority/CI/description, fetch execution history for top matches, return ranked list with explanations.

### Example 2: CSM Case Playbook Matching

**Input:** "What playbook should I use for this customer complaint about billing errors?"

**Steps:** Retrieve case details from `sn_customerservice_case`, query playbooks with `trigger_table=sn_customerservice_case`, match on product/category/description, recommend with customer satisfaction metrics from past executions.

### Example 3: Playbook Coverage Assessment

**Input:** "Show me which incident categories have no playbook coverage"

**Steps:** Query all active playbook trigger conditions, query all incident categories with volume counts, cross-reference to identify categories with incidents but no matching playbooks, prioritize gaps by incident volume.

## Related Skills

- `genai/playbook-generation` - Create new playbooks for identified gaps
- `genai/flow-generation` - Build underlying flows for playbook activities
- `itsm/incident-triage` - Incident categorization and routing
- `itsm/incident-lifecycle` - Incident management process
- `csm/case-summarization` - Customer case context for matching
