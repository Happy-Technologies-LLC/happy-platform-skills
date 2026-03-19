---
name: sentiment-analysis
version: 1.0.0
description: Analyze employee sentiment from HR cases, surveys, and interactions to track trends, identify flight risk indicators, and flag cases needing manager attention
author: Happy Technologies LLC
tags: [hrsd, sentiment, analysis, employee-experience, flight-risk, surveys, trends]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
    - SN-Add-Work-Notes
    - SN-Update-Record
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/sys_journal_field
    - /api/now/table/interaction
    - /api/now/table/asmt_assessment_instance
    - /api/now/table/asmt_assessment_instance_question
    - /api/now/table/survey_response
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/hr_category
  native:
    - Bash
complexity: advanced
estimated_time: 10-25 minutes
---

# Employee Sentiment Analysis

## Overview

This skill analyzes employee sentiment across HR Service Delivery touchpoints including cases, surveys, chat interactions, and feedback. It helps you:

- Assess sentiment polarity (positive, neutral, negative) from HR case communications
- Aggregate survey responses and satisfaction scores for trend analysis
- Identify flight risk indicators based on case patterns and sentiment decline
- Flag cases with escalating negativity for proactive manager outreach
- Track department-level and organization-wide sentiment trends over time
- Correlate sentiment signals with employee lifecycle events (tenure, role changes, reviews)

**When to use:** When HR leaders need visibility into employee satisfaction trends, when agents need to prioritize cases with negative sentiment, or when identifying employees at risk of attrition.

## Prerequisites

- **Roles:** `sn_hr_core.manager`, `sn_hr_core.case_reader`, or `sn_hr_core.admin`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.glide.assessment` (Assessment/Survey)
- **Access:** Read access to `sn_hr_core_case`, `sn_hr_core_profile`, `sys_journal_field`, `interaction`, `asmt_assessment_instance`, and `survey_response`
- **Knowledge:** Understanding of your organization's survey cadence, HR case types, and attrition indicators

## Procedure

### Step 1: Retrieve HR Cases for Sentiment Analysis

Fetch recent HR cases for the target scope (individual, department, or organization).

**Using MCP (Individual Employee):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person=[employee_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,description,state,priority,hr_service,opened_at,closed_at,contact_type,resolution_code,satisfaction_rating,reopened,reopen_count
  limit: 20
```

**Using MCP (Department-wide):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person.department=[department_sys_id]^opened_at>=javascript:gs.beginningOfLast90Days()^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,priority,hr_service,opened_at,subject_person,satisfaction_rating,contact_type
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case?sysparm_query=subject_person.department=[department_sys_id]^opened_at>=javascript:gs.beginningOfLast90Days()^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,short_description,state,priority,hr_service,opened_at,subject_person,satisfaction_rating,contact_type&sysparm_display_value=true&sysparm_limit=100
```

### Step 2: Extract Case Communications for Sentiment Scoring

Pull work notes, comments, and additional details from cases to analyze language and tone.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^element=comments^ORelement=work_notes^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by,element_id
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^element=comments^ORelement=work_notes^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by,element_id&sysparm_limit=50
```

### Step 3: Retrieve Chat and Interaction History

Fetch interaction records to analyze sentiment from live conversations.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: opened_for=[employee_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,type,channel,state,opened_at,closed_at,short_description,wrap_up_comment,satisfaction,direction
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=opened_for=[employee_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,type,channel,state,opened_at,closed_at,short_description,wrap_up_comment,satisfaction,direction&sysparm_display_value=true&sysparm_limit=25
```

### Step 4: Retrieve Survey and Assessment Responses

Pull employee survey responses for structured satisfaction data.

**Using MCP (Assessment Instances):**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance
  query: user=[employee_sys_id]^metric_type.nameLIKEemployee^ORmetric_type.nameLIKEHR^ORDERBYDESCtaken_on
  fields: sys_id,metric_type,taken_on,percent,state,user,category_scores
  limit: 10
```

**Using MCP (Individual Question Responses):**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance_question
  query: instance.user=[employee_sys_id]^instance.metric_type.nameLIKEemployee
  fields: sys_id,instance,metric,value,string_value,actual_value,category
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/asmt_assessment_instance?sysparm_query=user=[employee_sys_id]^metric_type.nameLIKEemployee^ORDERBYDESCtaken_on&sysparm_fields=sys_id,metric_type,taken_on,percent,state,user,category_scores&sysparm_display_value=true&sysparm_limit=10
```

### Step 5: Fetch Employee Profile and Lifecycle Context

Retrieve the employee's HR profile to correlate sentiment with lifecycle events.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[employee_sys_id]
  fields: sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,last_review_date,last_promotion_date,years_in_role,employee_type
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_profile?sysparm_query=user=[employee_sys_id]&sysparm_fields=sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,last_review_date,last_promotion_date,years_in_role&sysparm_display_value=true&sysparm_limit=1
```

### Step 6: Analyze Case Type Patterns

Examine the types of cases filed to identify concerning patterns.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person=[employee_sys_id]^opened_at>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,hr_service,hr_service.name,opened_at,state,priority
  limit: 50
```

Map case types to sentiment-relevant categories:

```
=== CASE TYPE PATTERN ANALYSIS ===

High-Risk Case Types (negative sentiment indicators):
- Workplace Complaint / Grievance
- Accommodation Request (especially repeated)
- Policy Dispute / Exception Request
- Manager Escalation
- Exit / Separation Inquiry

Neutral Case Types:
- Benefits Enrollment / Change
- Address / Personal Info Update
- Payroll Inquiry
- General HR Question

Positive Case Types:
- Internal Mobility / Transfer Request
- Training / Development Request
- Recognition Nomination
- Promotion Processing
```

### Step 7: Compile Sentiment Assessment

Assemble findings into a structured sentiment report:

```
=== EMPLOYEE SENTIMENT ASSESSMENT ===

Employee: Jane Smith | Engineering | Senior Software Engineer
Tenure: 4.8 years | Last Promotion: 18 months ago
Manager: Bob Johnson

--- Overall Sentiment Score ---
Composite Score: 42/100 (Declining - was 68/100 six months ago)
Trend: Negative trajectory over 3 months
Risk Level: ELEVATED

--- Case Sentiment Breakdown ---
Total Cases (12 months): 7
| Period        | Cases | Avg Sentiment | Dominant Tone     |
|---------------|-------|---------------|-------------------|
| Last 30 days  | 3     | Negative      | Frustrated        |
| 30-90 days    | 2     | Neutral       | Matter-of-fact    |
| 90-365 days   | 2     | Positive      | Appreciative      |

--- Survey Scores ---
| Survey                  | Date       | Score | Org Average |
|-------------------------|------------|-------|-------------|
| Q1 Engagement Pulse     | 2026-03-01 | 3.2/5 | 4.1/5       |
| Q4 Annual Engagement    | 2025-12-15 | 3.8/5 | 4.0/5       |
| Q3 Engagement Pulse     | 2025-09-01 | 4.2/5 | 4.1/5       |

--- Flight Risk Indicators ---
[!] Case volume increasing (3 cases in 30 days vs 2 in prior 60)
[!] Engagement survey score dropped 1.0 point in 6 months
[!] Filed policy exception request (potential dissatisfaction)
[!] No promotion in 18 months (above team average of 14 months)
[ ] No internal mobility applications detected
[ ] No exit-related case types filed

--- Sentiment Signals from Communications ---
- Case HRC0012456: "I've raised this issue multiple times..."
  Signal: Repeat frustration, unresolved concern
- Case HRC0012501: "The process seems unnecessarily complicated"
  Signal: Process dissatisfaction
- Case HRC0012523: "I need to understand my options"
  Signal: Ambiguous; may indicate exploration of alternatives

--- Recommended Actions ---
1. IMMEDIATE: Flag for manager 1-on-1 conversation
2. SHORT-TERM: Resolve open cases within SLA to rebuild trust
3. MEDIUM-TERM: Career development conversation recommended
4. TRACKING: Add to monthly sentiment watch list
```

### Step 8: Flag Case for Manager Attention

If sentiment analysis reveals risk, add a work note and flag for review.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_hr_core_case
  sys_id: [latest_case_sys_id]
  work_notes: "SENTIMENT ALERT: Employee shows declining sentiment trend (score 42/100, down from 68). Flight risk indicators detected: increasing case volume, declining survey scores, no recent career advancement. Recommend manager outreach and career development discussion."
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query cases, profiles, surveys, interactions, journal entries |
| `SN-NL-Search` | Natural language search for cases with specific sentiment keywords |
| `SN-Get-Record` | Retrieve detailed single records for deep-dive analysis |
| `SN-Add-Work-Notes` | Document sentiment findings on case records |
| `SN-Update-Record` | Update profile risk indicators or sentiment scores |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_case` | GET | HR cases for sentiment extraction |
| `/api/now/table/sys_journal_field` | GET | Case communications and comments |
| `/api/now/table/interaction` | GET | Chat and phone interaction history |
| `/api/now/table/asmt_assessment_instance` | GET | Survey/assessment response data |
| `/api/now/table/asmt_assessment_instance_question` | GET | Individual survey question responses |
| `/api/now/table/sn_hr_core_profile` | GET | Employee lifecycle context |
| `/api/now/table/sn_hr_le_case_type` | GET | Case type classification |

## Best Practices

- **Use multiple signals:** Never rely on a single data point; combine case sentiment, survey scores, and interaction tone for accuracy
- **Establish baselines:** Compare individual sentiment against department and organization averages for meaningful context
- **Track trends, not snapshots:** A single negative case is less concerning than a sustained declining trend
- **Respect privacy:** Sentiment data is sensitive; share only with authorized HR personnel and the employee's direct chain
- **Avoid bias in scoring:** Focus on observable patterns (case frequency, survey scores) rather than subjective interpretation of isolated comments
- **Calibrate flight risk thresholds:** Work with HR leadership to define what score thresholds trigger specific interventions
- **Consider lifecycle context:** New hires in their first 90 days may show different patterns than tenured employees; adjust analysis accordingly
- **Document methodology:** Record the scoring criteria and data sources used so results are reproducible and auditable

## Troubleshooting

### "Survey responses not found"

**Cause:** Surveys may use a different assessment type name or may be in a separate survey plugin
**Solution:** Query `asmt_metric_type` to list available assessment types. Also check `survey_response` table as an alternative storage location

### "Journal entries return too much data"

**Cause:** High-volume cases may have hundreds of journal entries
**Solution:** Filter by date range using `sys_created_on>=javascript:gs.daysAgo(90)` and limit to `element=comments` for employee-facing communications

### "Satisfaction rating field is empty"

**Cause:** Not all case types collect CSAT; it may be captured post-closure
**Solution:** Check `sn_hr_core_case` for `close_notes` and check if a separate satisfaction survey is triggered on case closure via `asmt_assessment_instance`

### "Department-level query times out"

**Cause:** Large departments with many cases over 12 months can exceed query limits
**Solution:** Break the query into monthly chunks or use `sysparm_query=subject_person.department=[id]^opened_at>=YYYY-MM-DD^opened_at<=YYYY-MM-DD` with pagination

## Examples

### Example 1: Individual Employee Sentiment Check

**Input:** "Analyze sentiment for employee Jane Smith over the past 6 months"

**Steps:**
1. Look up employee sys_id from `sn_hr_core_profile`
2. Query cases, interactions, and surveys
3. Score sentiment from communications
4. Compile individual sentiment report

### Example 2: Department Sentiment Dashboard

**Input:** "Show sentiment trends for the Engineering department"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person.department.name=Engineering^opened_at>=javascript:gs.beginningOfLast12Months()
  fields: number,subject_person,hr_service,opened_at,satisfaction_rating,state,priority
  limit: 200
```

Aggregate by month and case type to produce trend visualization data.

### Example 3: Flight Risk Report for HR Leadership

**Input:** "Identify employees with highest flight risk indicators"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: hr_service.nameLIKEexit^ORhr_service.nameLIKEseparation^ORhr_service.nameLIKEresignation^opened_at>=javascript:gs.daysAgo(90)
  fields: number,subject_person,hr_service,opened_at,state,subject_person.department
  limit: 50
```

Cross-reference with declining survey scores and increasing case volumes to prioritize the list.

## Related Skills

- `hrsd/case-summarization` - Detailed case context for sentiment-flagged cases
- `hrsd/chat-reply-recommendation` - Adjust reply tone based on sentiment analysis
- `hrsd/persona-assistant` - Personalized support for at-risk employees
- `reporting/trend-analysis` - Visualization of sentiment trends over time
- `reporting/executive-dashboard` - Executive-level sentiment metrics
