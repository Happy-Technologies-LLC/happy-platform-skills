---
name: case-summarization
version: 1.0.0
description: Summarize HR cases with timeline, assigned team, employee details, case type classification, SLA status, and COE routing
author: Happy Technologies LLC
tags: [hrsd, hr-case, summarization, sla, coe, triage, employee-services]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/task_sla
    - /api/now/table/hr_category
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# HR Case Summarization

## Overview

This skill provides a structured approach to summarizing HR Service Delivery cases in ServiceNow. It helps you:

- Generate concise summaries of open and resolved HR cases
- Build a timeline of case activities, tasks, and communications
- Identify the assigned Center of Excellence (COE) and routing rationale
- Classify case types and categories for reporting
- Evaluate SLA status and highlight breaches or at-risk cases
- Surface employee profile context for better case understanding

**When to use:** When HR managers, agents, or executives need a quick understanding of an HR case's current state, history, and compliance posture.

## Prerequisites

- **Roles:** `sn_hr_core.case_reader`, `sn_hr_core.case_writer`, or `sn_hr_core.manager`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery)
- **Access:** Read access to `sn_hr_core_case`, `sn_hr_core_task`, `sn_hr_core_profile`, and `task_sla`
- **Knowledge:** Familiarity with your organization's HR COE structure and case type taxonomy

## Procedure

### Step 1: Retrieve the HR Case Record

Fetch the core case details including state, priority, assignment, and categorization.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: number=HRC0010042
  fields: sys_id,number,short_description,description,state,priority,hr_service,assigned_to,assignment_group,opened_at,opened_by,closed_at,contact_type,subject_person,parent,hr_service.name
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case?sysparm_query=number=HRC0010042&sysparm_fields=sys_id,number,short_description,description,state,priority,hr_service,assigned_to,assignment_group,opened_at,opened_by,closed_at,contact_type,subject_person,parent&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Employee Profile

Fetch the subject person's HR profile for context about department, location, and employment history.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[subject_person_sys_id]
  fields: sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_profile?sysparm_query=user=[subject_person_sys_id]&sysparm_fields=sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building&sysparm_display_value=true&sysparm_limit=1
```

### Step 3: Identify Case Type and COE Routing

Look up the case type configuration to understand which COE handles this case and the expected lifecycle.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: sys_id=[hr_service_sys_id]
  fields: sys_id,name,description,hr_service_center,fulfillment_group,sla,active,category
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_le_case_type?sysparm_query=sys_id=[hr_service_sys_id]&sysparm_fields=sys_id,name,description,hr_service_center,fulfillment_group,sla,active,category&sysparm_display_value=true&sysparm_limit=1
```

### Step 4: Retrieve Associated Tasks

Fetch all tasks related to the HR case to build the activity timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_task
  query: parent=[case_sys_id]^ORDERBYsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,assignment_group,sys_created_on,closed_at,work_notes_list,priority
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_task?sysparm_query=parent=[case_sys_id]^ORDERBYsys_created_on&sysparm_fields=sys_id,number,short_description,state,assigned_to,assignment_group,sys_created_on,closed_at,work_notes_list,priority&sysparm_display_value=true&sysparm_limit=50
```

### Step 5: Check SLA Status

Query task SLA records to identify breaches or at-risk timelines.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=[case_sys_id]
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,start_time,end_time,pause_duration
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=task=[case_sys_id]&sysparm_fields=sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,start_time,end_time,pause_duration&sysparm_display_value=true&sysparm_limit=10
```

### Step 6: Retrieve Case Category Hierarchy

Fetch the HR category chain for classification context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: hr_category
  query: sys_id=[category_sys_id]
  fields: sys_id,name,parent,topic,description,active
  limit: 5
```

### Step 7: Compile the Summary

Assemble findings into a structured summary document:

```
=== HR CASE SUMMARY ===
Case Number: HRC0010042
Status: Work in Progress
Priority: 3 - Moderate
Opened: 2025-11-15 09:30:00
Contact Type: Employee Self-Service

--- Employee Details ---
Name: Jane Smith
Department: Engineering
Location: San Francisco
Title: Senior Software Engineer
Hire Date: 2021-03-15
Manager: Bob Johnson

--- Case Classification ---
Type: Benefits Enrollment Change
Category: Benefits > Health Insurance
COE: Benefits Administration
Fulfillment Group: Benefits Team - West

--- SLA Status ---
Resolution SLA: 72 hours (45% elapsed, on track)
Response SLA: COMPLETED - Met within 2 hours
Breach Status: No breaches

--- Activity Timeline ---
1. 2025-11-15 09:30 - Case opened via self-service portal
2. 2025-11-15 09:32 - Auto-routed to Benefits Administration COE
3. 2025-11-15 10:15 - Assigned to Agent Sarah Lee
4. 2025-11-15 14:00 - Task SHRT0005001 created: Verify eligibility
5. 2025-11-16 08:30 - Eligibility verified, task completed
6. 2025-11-16 09:00 - Task SHRT0005002 created: Process enrollment change

--- Open Tasks ---
- SHRT0005002: Process enrollment change (In Progress, assigned to Sarah Lee)
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Structured queries for cases, tasks, profiles, SLAs |
| `SN-NL-Search` | Natural language searches like "open HR cases for engineering" |
| `SN-Get-Record` | Retrieve a single record by sys_id |
| `SN-Add-Work-Notes` | Document the summary as a work note on the case |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_hr_core_case` | GET | Query HR cases |
| `/api/now/table/sn_hr_core_task` | GET | Query HR tasks |
| `/api/now/table/sn_hr_core_profile` | GET | Employee HR profiles |
| `/api/now/table/sn_hr_le_case_type` | GET | Case type configuration |
| `/api/now/table/task_sla` | GET | SLA records for cases |
| `/api/now/table/hr_category` | GET | Category hierarchy |

## Best Practices

- **Include SLA context:** Always check SLA status; breached or at-risk cases require immediate attention
- **Respect confidentiality:** HR cases may contain sensitive data (medical, disciplinary). Limit summary distribution to authorized personnel
- **Link related cases:** Check the `parent` field for child cases and the `correlation_id` for related tickets
- **Verify COE routing:** Confirm the case is assigned to the correct COE based on the case type configuration
- **Use display values:** Always request `sysparm_display_value=true` to get human-readable names instead of sys_ids
- **Check for reopened cases:** Review the `reopen_count` field to identify cases that have been reopened

## Troubleshooting

### "No HR case found with that number"

**Cause:** Case number format may differ or case may be in a different scope
**Solution:** Try searching with `numberLIKEHRC001` or query by `short_description`

### "Employee profile not found"

**Cause:** The subject person may not have an HR profile record yet
**Solution:** Query `sys_user` table directly using the `subject_person` sys_id as a fallback

### "SLA records missing"

**Cause:** SLA definitions may not be attached to this case type
**Solution:** Verify that the `sn_hr_le_case_type` record has an SLA definition configured

### "Tasks not returned"

**Cause:** Tasks may use a different parent reference field
**Solution:** Also query with `parent.number=HRC0010042` or check the `sn_hr_core_task` table for `hr_case` reference field

## Examples

### Example 1: Open Case Summary for Management Review

**Input:** "Summarize HR case HRC0010042"

**Steps:**
1. Query `sn_hr_core_case` for case details
2. Retrieve employee profile from `sn_hr_core_profile`
3. Check COE routing via `sn_hr_le_case_type`
4. Pull all tasks from `sn_hr_core_task`
5. Check SLA status from `task_sla`
6. Compile into structured summary format

### Example 2: Batch Summary for COE Manager

**Input:** "Summarize all open cases for the Payroll COE"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: active=true^assignment_group.nameLIKEPayroll^ORDERBYDESCpriority
  fields: number,short_description,state,priority,assigned_to,opened_at,subject_person
  limit: 25
```

### Example 3: SLA Breach Report Summary

**Input:** "Show me HR cases with breached SLAs"

```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task.sys_class_name=sn_hr_core_case^has_breached=true^stage!=cancelled
  fields: task,sla,has_breached,planned_end_time,end_time,business_percentage
  limit: 20
```

## Related Skills

- `hrsd/sentiment-analysis` - Analyze employee sentiment within HR cases
- `hrsd/persona-assistant` - Persona-based HR assistance
- `itsm/incident-lifecycle` - General incident summarization patterns
- `reporting/sla-analysis` - SLA trend analysis and reporting
- `reporting/executive-dashboard` - Executive-level metrics and summaries

## References

- [ServiceNow HR Case Management](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_HRCaseManagement.html)
- [HR Service Delivery COE Configuration](https://docs.servicenow.com/bundle/utah-hr-service-delivery/page/product/human-resources/concept/c_CentersOfExcellence.html)
- [Task SLA Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-level-management/concept/c_ServiceLevelManagement.html)
