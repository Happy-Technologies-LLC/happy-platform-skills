---
name: ai-lens
version: 1.0.0
description: ServiceNow AI Lens that analyzes records in context, surfaces related information, generates insights from patterns, and recommends actions from any list or form view across ITSM, CSM, HRSD, and platform tables
author: Happy Technologies LLC
tags: [genai, ai-lens, insights, recommendations, context-analysis, record-analysis, patterns, actions, cross-module]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-NL-Search
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/{table_name}
    - /api/now/stats/{table_name}
    - /api/now/table/sys_audit
    - /api/now/table/task_sla
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 10-25 minutes
---

# ServiceNow AI Lens

## Overview

AI Lens provides contextual intelligence for any ServiceNow record, surfacing insights that are not immediately visible on the form or list view:

- **Related Information**: Connected records, upstream/downstream dependencies, and associated knowledge
- **Pattern Analysis**: Historical trends for similar records, recurring issues, and anomaly detection
- **Risk Assessment**: SLA risk, escalation likelihood, and potential business impact
- **Recommended Actions**: Next best actions based on record state, history, and peer analysis
- **Cross-Module Context**: Information from ITSM, CSM, HRSD, CMDB, and other modules that enrich understanding
- **Predictive Insights**: Estimated resolution time, likely assignment, and probable root cause

**When to use:** When agents, managers, or analysts need a comprehensive contextual view of any record that goes beyond what is visible on the standard form, or when building AI-augmented workspace experiences.

## Prerequisites

- **Roles:** `itil`, `sn_customerservice_agent`, `sn_hr_core.case_reader`, or `admin`
- **Plugins:** Platform foundation (no specific plugin required; leverages existing module data)
- **Access:** Read access to the target table and related tables (CMDB, knowledge, SLA)
- **Knowledge:** Cross-module ServiceNow data model, relationship patterns between tables
- **Related Skills:** `itsm/incident-activity-summarization` for activity context, `genai/playbook-recommendations` for action recommendations

## Procedure

### Step 1: Identify the Target Record and Table

Determine what record the user is viewing and its table context.

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: <record_sys_id>
  fields: sys_id,sys_class_name,number,short_description,description,state,priority,impact,urgency,category,subcategory,assigned_to,assignment_group,opened_at,opened_by,caller_id,cmdb_ci,parent,caused_by,problem_id,rfc
```

**REST Approach:**
```
GET /api/now/table/incident/<record_sys_id>
  ?sysparm_fields=sys_id,sys_class_name,number,short_description,description,state,priority,impact,urgency,category,subcategory,assigned_to,assignment_group,opened_at,caller_id,cmdb_ci,problem_id,rfc
  &sysparm_display_value=true
```

### Step 2: Discover Table Schema for Context Fields

Understand what fields and references are available for this record type.

**MCP Approach:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

Identify reference fields that link to other tables for cross-module exploration.

### Step 3: Surface Related Records

Query for records connected to the target through references, relationships, and shared attributes.

**Related Incidents (same CI or category):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=<ci_sys_id>^sys_id!=<current_sys_id>^active=true^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,priority,opened_at,assigned_to
  limit: 10
```

**CMDB Relationships (upstream/downstream services):**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=<ci_sys_id>^ORtype_id.name=Depends on::Used by
  fields: sys_id,parent,child,type_id
  limit: 20
```

**Related Knowledge Articles:**
```
Tool: SN-NL-Search
Parameters:
  query: "<short_description>"
  table: kb_knowledge
  limit: 5
```

**Associated Change Requests:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: cmdb_ci=<ci_sys_id>^state!=closed^ORstate=closed^closed_at>javascript:gs.daysAgo(7)
  fields: sys_id,number,short_description,state,type,start_date,end_date,risk
  limit: 5
```

**Problem Records:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: sys_id=<problem_id>^ORcmdb_ci=<ci_sys_id>^active=true
  fields: sys_id,number,short_description,state,root_cause,workaround
  limit: 5
```

### Step 4: Analyze Historical Patterns

Find patterns from similar records in the past.

**Similar Past Incidents:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: category=<category>^subcategory=<subcategory>^state=6^resolved_at>javascript:gs.daysAgo(180)
  fields: sys_id,number,short_description,resolved_at,resolution_code,close_notes,assigned_to,assignment_group,calendar_duration
  limit: 25
```

**Aggregate Statistics:**

**REST Approach:**
```
GET /api/now/stats/incident
  ?sysparm_query=category=<category>^subcategory=<subcategory>^resolved_at>javascript:gs.daysAgo(180)
  &sysparm_avg_fields=calendar_duration,reassignment_count
  &sysparm_count=true
```

Build pattern analysis:
```
=== PATTERN ANALYSIS ===
Based on 47 similar incidents (same category/subcategory, last 180 days):

Resolution Statistics:
- Average Resolution Time: 4.2 hours
- Median Resolution Time: 2.8 hours
- 90th Percentile: 12 hours
- Current Incident Age: 1.5 hours (below average)

Common Resolution Methods:
1. Service restart (42%) - Average 1.5 hours
2. Configuration change (28%) - Average 3.2 hours
3. Vendor escalation (18%) - Average 18 hours
4. Patch deployment (12%) - Average 8 hours

Assignment Patterns:
- Most frequently resolved by: Network Operations (38%)
- Second: Application Support (25%)
- Current assignment: Database Team (resolves 15% of similar incidents)

Recurrence:
- Same CI has had 3 similar incidents in 90 days
- Same category averages 8 incidents per month
```

### Step 5: Assess Risk Factors

Evaluate current risk indicators for the record.

**SLA Status:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=<record_sys_id>
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage
  limit: 5
```

**Escalation Risk:**
```
=== RISK ASSESSMENT ===

SLA Risk:
- Response SLA: 45% elapsed, 55% remaining (ON TRACK)
- Resolution SLA: 35% elapsed, target in 6.5 hours (ON TRACK)
- Breach Probability: 15% (based on similar incident resolution times)

Escalation Indicators:
- VIP Caller: No
- Business-Critical CI: Yes (production database)
- Priority: P2 (escalation at 4 hours if unresolved)
- Current Age: 1.5 hours
- Reassignment Count: 0 (good)

Impact Assessment:
- Affected Users: ~200 (based on CI dependency mapping)
- Dependent Services: 3 (Order Processing, Reporting, Auth)
- Business Impact: Medium-High (production service, business hours)
- Revenue Impact: Potential (Order Processing affected)
```

### Step 6: Generate Recommended Actions

Based on all gathered context, recommend next steps.

```
=== RECOMMENDED ACTIONS ===
Record: INC0067890 - Database connection pool exhaustion

IMMEDIATE ACTIONS:
1. [HIGH PRIORITY] Check current connection pool status
   - Similar incidents resolved 42% of the time by service restart
   - Run diagnostic: Query connection pool metrics via monitoring API

2. [RECOMMENDED] Review recent changes on this CI
   - CHG0012340 was implemented 2 hours ago on related app server
   - Potential correlation with incident timing

3. [SUGGESTED] Engage Network Operations
   - This team resolves 38% of similar incidents (highest rate)
   - Current team (Database) resolves 15% of similar incidents

KNOWLEDGE RESOURCES:
4. Review KB0012345: "Database Connection Pool Troubleshooting"
   - Rating: 4.5/5, used to resolve 12 similar incidents
   - Key procedure: Connection pool drain and restart (Section 3)

5. Review KB0013001: "Application Server Health Checks"
   - Related to recent change CHG0012340

PREVENTIVE ACTIONS:
6. Create Problem record to investigate recurrence
   - 3 similar incidents on this CI in 90 days suggests systemic issue
   - Link to existing Problem PRB0004567 if related

COMMUNICATION:
7. Notify affected service owners
   - Order Processing team (primary dependency)
   - Send proactive status update via major incident channel
```

### Step 7: Cross-Module Enrichment

Pull contextual data from other ServiceNow modules.

**Customer Context (for CSM cases):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: account=<account_sys_id>^active=true
  fields: sys_id,number,short_description,priority,state,product
  limit: 10
```

**HR Context (for employee-related records):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person=<caller_sys_id>^active=true
  fields: sys_id,number,short_description,hr_service,state
  limit: 5
```

**CMDB Asset Context:**
```
Tool: SN-Query-Table
Parameters:
  table_name: alm_hardware
  query: ci=<ci_sys_id>
  fields: sys_id,display_name,model,serial_number,warranty_expiration,install_status,cost
  limit: 1
```

### Step 8: Compile the AI Lens View

Assemble all insights into a comprehensive contextual panel:

```
=== AI LENS: INC0067890 ===
Database Connection Pool Exhaustion on prod-db-01

--- Quick Stats ---
Age: 1h 30m | Priority: P2 | SLA: On Track (65% remaining)
Similar Incidents (180d): 47 | Avg Resolution: 4.2h
Recurrence on this CI: 3 in 90 days (FLAGGED)

--- Related Records ---
Active on Same CI:
  - INC0067885 (P3, monitoring alert - auto-resolved)
  - CHG0012340 (Normal, app server config - completed 2h ago) *CORRELATION*

Known Problems:
  - PRB0004567: Recurring connection pool issues (Under Investigation)

Knowledge:
  - KB0012345: Connection Pool Troubleshooting (4.5 stars, 12 resolves)
  - KB0013001: App Server Health Checks (relevant to recent change)

--- Insights ---
1. Recent change CHG0012340 correlates with incident timing -- investigate
2. Connection pool issues are recurring (3 in 90 days) -- systemic root cause likely
3. Service restart resolves 42% of similar incidents -- try first
4. Current team assignment may not be optimal -- Network Ops has higher success rate

--- Recommended Actions ---
1. Check connection pool metrics [Most Likely Resolution: Service Restart]
2. Investigate correlation with CHG0012340 [Change-Related Root Cause]
3. Consider reassignment to Network Operations [Higher Success Rate]
4. Create/link to Problem PRB0004567 [Prevent Recurrence]
```

### Step 9: Track Lens Usage and Effectiveness

Monitor how AI Lens recommendations are used.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: u_ai_lens_usage
  data:
    u_record: "<record_sys_id>"
    u_table: "incident"
    u_recommendations_shown: 4
    u_recommendation_followed: ""
    u_user: "<current_user_sys_id>"
    u_timestamp: "2025-12-10 04:00:00"
```

### Step 10: Provide Lens for List Views

Generate aggregate insights for a list of records.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: assignment_group=<group_sys_id>^active=true^ORDERBYpriority
  fields: sys_id,number,short_description,priority,state,opened_at,cmdb_ci,category
  limit: 50
```

```
=== AI LENS: Team Queue Overview ===
Team: Database Administration | Active Incidents: 12

Queue Health:
- P1: 0 | P2: 2 | P3: 7 | P4: 3
- SLA At Risk: 1 (INC0067888 - 85% elapsed)
- Avg Age: 3.2 days | Oldest: 8 days (INC0067500)
- Reassignment Rate: 15% (below team average of 22%)

Patterns Detected:
- 4 incidents related to "connection pool" on database CIs (cluster)
- 3 incidents from same caller (possible systemic issue for that user)
- 2 incidents linked to CHG0012340 (change correlation)

Priority Actions:
1. Address SLA-at-risk incident INC0067888 immediately
2. Investigate connection pool cluster (4 incidents) as potential problem
3. Contact repeat caller to address underlying issue
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Get-Record | Retrieve target record details | Initial context gathering |
| SN-Query-Table | Fetch related records, history, patterns | Cross-module data retrieval |
| SN-NL-Search | Find knowledge articles by similarity | Knowledge recommendation |
| SN-Update-Record | Save lens insights to record | Persisting recommendations |
| SN-Get-Table-Schema | Discover available fields and references | Understanding record structure |

## Best Practices

1. **Prioritize actionable insights** -- surface what the user can act on, not just information
2. **Show evidence for every insight** -- link claims to data (e.g., "42% resolution rate based on 47 incidents")
3. **Highlight correlations** -- recent changes, recurring patterns, and related records are high-value
4. **Respect performance** -- limit queries to relevant time windows and record counts
5. **Adapt to record type** -- incident lens differs from change request lens or HR case lens
6. **Flag anomalies** -- unusual patterns (high reassignment, repeat caller, rapid reopen) deserve attention
7. **Include knowledge proactively** -- always search for relevant KB articles
8. **Show SLA context** -- time remaining and breach probability are critical for task records
9. **Cross-reference CMDB** -- CI dependencies reveal blast radius and root cause connections
10. **Support both form and list views** -- individual record insights and queue-level patterns serve different needs

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No related records found | CI field is empty on the record | Fall back to category-based and description-based similarity |
| Pattern analysis slow | Too many historical records queried | Narrow time window (90 days instead of 365) and add category filter |
| Knowledge results irrelevant | Short description too vague | Combine short_description with category for better NL search |
| CMDB relationships missing | CI not in CMDB or relationships not mapped | Use `cmdb_ci` table directly for basic CI info |
| SLA records absent | No SLA definitions for this record type | Skip SLA section and note in output |
| Cross-module data inaccessible | Role restrictions on other module tables | Limit lens to accessible tables based on user roles |

## Examples

### Example 1: Incident Form AI Lens

**Input:** "Show AI Lens for INC0067890"

**Steps:** Retrieve incident, query related incidents on same CI, fetch CMDB dependencies, find knowledge articles, analyze historical patterns, assess SLA risk, generate recommended actions.

### Example 2: CSM Case AI Lens

**Input:** "Analyze case CS0034567 with AI Lens"

**Steps:** Retrieve case, pull customer account history, find similar cases by product/category, check for known issues or outages, retrieve customer sentiment trend, recommend response strategy.

### Example 3: Queue-Level AI Lens

**Input:** "Show AI Lens for the Network Operations incident queue"

**Steps:** Query all active incidents for the group, aggregate by priority/category/age, identify clusters and patterns, flag SLA risks, detect repeat issues, generate queue management recommendations.

## Related Skills

- `itsm/incident-activity-summarization` - Detailed activity summaries for individual incidents
- `genai/playbook-recommendations` - Match records to automation playbooks
- `cmdb/impact-analysis` - CI dependency and impact analysis
- `knowledge/content-recommendation` - Knowledge article recommendations
- `reporting/trend-analysis` - Historical trend analysis and reporting
- `itsm/incident-triage` - Incident classification and routing
