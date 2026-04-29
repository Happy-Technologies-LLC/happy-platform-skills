---
name: fsm-sidebar-summarization
version: 1.0.0
description: Generate sidebar summaries for field technicians with key case context, asset history, customer details, and actionable next steps for mobile field service views
author: Happy Technologies LLC
tags: [fsm, sidebar, summarization, field-service, technician, mobile, context]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/wm_order
    - /api/now/table/wm_task
    - /api/now/table/alm_asset
    - /api/now/table/cmdb_ci
    - /api/now/table/sys_journal_field
    - /api/now/table/core_company
    - /api/now/table/task_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 5-10 minutes
---

# Sidebar Summarization

## Overview

This skill generates concise, mobile-optimized sidebar summaries for field technicians working within ServiceNow Field Service Management. The sidebar summary provides at-a-glance context that technicians need while on-site, without requiring them to navigate through multiple records.

Key capabilities:
- Produce a compact summary of the current work order or task context
- Highlight critical customer information, site access instructions, and contact details
- Surface asset service history and known issues for the equipment being serviced
- Display SLA countdown and priority indicators in a scannable format
- Include safety warnings, required tools, and prerequisite checklist items
- Provide quick-reference links to related records and knowledge articles

**When to use:** When a field technician opens a work order task on their mobile device and needs immediate context about the job, customer, asset, and any safety or logistical considerations before beginning work.

## Prerequisites

- **Roles:** `wm_agent`, `wm_dispatcher`, or `wm_admin`
- **Access:** Read access to `wm_order`, `wm_task`, `alm_asset`, `cmdb_ci`, `sys_journal_field`, `core_company`, and `task_sla` tables
- **Plugins:** Field Service Management (com.snc.work_management) must be active
- **Context:** A valid work order task sys_id or number to generate the sidebar for

## Procedure

### Step 1: Retrieve the Current Work Order Task

Fetch the task record that the technician is currently viewing.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: wm_task
  sys_id: [TASK_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,urgency,work_order,assigned_to,assignment_group,location,cmdb_ci,asset,scheduled_start,scheduled_end,estimated_work_duration,estimated_travel_duration,sequence,work_notes_list,contact_type
```

**Using REST API:**
```bash
GET /api/now/table/wm_task/{TASK_SYS_ID}?sysparm_fields=sys_id,number,short_description,description,state,priority,urgency,work_order,assigned_to,assignment_group,location,cmdb_ci,asset,scheduled_start,scheduled_end,estimated_work_duration,estimated_travel_duration,sequence,contact_type&sysparm_display_value=true
```

### Step 2: Retrieve Parent Work Order Context

Get the parent work order for broader context.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: wm_order
  sys_id: [WORK_ORDER_SYS_ID]
  fields: sys_id,number,short_description,state,priority,category,subcategory,caller_id,company,location,opened_at,sla_due,cmdb_ci,asset,contact_type,follow_up
```

**Using REST API:**
```bash
GET /api/now/table/wm_order/{WORK_ORDER_SYS_ID}?sysparm_fields=sys_id,number,short_description,state,priority,category,subcategory,caller_id,company,location,opened_at,sla_due,cmdb_ci,asset,contact_type,follow_up&sysparm_display_value=true
```

### Step 3: Get Customer and Site Information

Retrieve company details and site-specific instructions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: sys_id=[COMPANY_SYS_ID]
  fields: sys_id,name,street,city,state,zip,country,phone,notes,latitude,longitude
  limit: 1
```

For location-specific details:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_location
  query: sys_id=[LOCATION_SYS_ID]
  fields: sys_id,name,full_name,street,city,state,zip,phone,contact,latitude,longitude,stock_room
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/core_company/{COMPANY_SYS_ID}?sysparm_fields=sys_id,name,street,city,state,zip,phone,notes&sysparm_display_value=true

GET /api/now/table/cmn_location/{LOCATION_SYS_ID}?sysparm_fields=sys_id,name,full_name,street,city,state,zip,phone,contact,latitude,longitude,stock_room&sysparm_display_value=true
```

### Step 4: Retrieve Asset Service History

Get the asset being serviced and its recent maintenance history.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: alm_asset
  query: sys_id=[ASSET_SYS_ID]
  fields: sys_id,display_name,asset_tag,serial_number,model,model_category,install_status,warranty_expiration,purchase_date,vendor,assigned_to,location
  limit: 1
```

Retrieve recent work history for the asset:
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: asset=[ASSET_SYS_ID]^sys_id!=[CURRENT_WO_SYS_ID]^ORDERBYDESCopened_at
  fields: number,short_description,state,category,opened_at,closed_at,resolution_code
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/alm_asset/{ASSET_SYS_ID}?sysparm_fields=sys_id,display_name,asset_tag,serial_number,model,model_category,install_status,warranty_expiration,vendor&sysparm_display_value=true

GET /api/now/table/wm_order?sysparm_query=asset=[ASSET_SYS_ID]^sys_id!=[CURRENT_WO_SYS_ID]^ORDERBYDESCopened_at&sysparm_fields=number,short_description,state,category,opened_at,closed_at&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Check SLA Status

Retrieve SLA information for urgency context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=[WORK_ORDER_SYS_ID]
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=task=[WORK_ORDER_SYS_ID]&sysparm_fields=sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage&sysparm_limit=5&sysparm_display_value=true
```

### Step 6: Retrieve Recent Work Notes

Pull the most recent work notes for immediate context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[TASK_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[TASK_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=5
```

### Step 7: Build the Sidebar Summary

Assemble a compact, scannable sidebar summary:

```
=== TASK SIDEBAR ===
[Task Number] - [Priority Badge]
[Short Description]
Status: [state] | ETA: [estimated_work_duration]

CUSTOMER:
[company_name]
[location_address]
Contact: [caller_name] | [phone]

ASSET:
[asset_name] | S/N: [serial_number]
Model: [model] | Warranty: [status]
Prior Service: [count] visits ([last_visit_date])

SLA: [time_remaining] remaining
[progress_bar_indicator]

LATEST NOTES:
- [most_recent_note_summary]
- [second_most_recent_summary]

CHECKLIST:
[ ] Verify site access
[ ] Confirm customer contact
[ ] Check parts inventory
[ ] Review safety requirements
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language lookup (e.g., "find my assigned tasks for today") |
| `SN-Query-Table` | Structured queries for task, asset, company, and SLA data |
| `SN-Read-Record` | Direct record retrieval by sys_id for task or work order |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/wm_task` | GET | Current task details |
| `/api/now/table/wm_order` | GET | Parent work order context |
| `/api/now/table/alm_asset` | GET | Asset details and warranty |
| `/api/now/table/cmdb_ci` | GET | Configuration item data |
| `/api/now/table/core_company` | GET | Customer company details |
| `/api/now/table/cmn_location` | GET | Site location and address |
| `/api/now/table/task_sla` | GET | SLA compliance status |
| `/api/now/table/sys_journal_field` | GET | Recent work notes |

## Best Practices

- **Keep it compact:** Sidebar summaries should be readable on mobile devices without scrolling excessively
- **Prioritize actionable info:** Lead with what the technician needs to act on immediately
- **Surface safety warnings first:** Any safety-related notes should appear at the top of the sidebar
- **Show asset history:** Prior service visits help technicians anticipate recurring issues
- **Include contact details:** Technicians need customer contact information readily accessible
- **Display SLA visually:** Use percentage or time-remaining indicators rather than raw timestamps
- **Cache when possible:** Sidebar data should be pre-fetched to avoid delays on slow mobile connections
- **Omit unnecessary detail:** Exclude internal escalation history and management-only fields

## Troubleshooting

### "Task record not found"

**Cause:** The task sys_id is invalid or the task has been deleted.
**Solution:** Verify the sys_id format. Query `wm_task` by number instead if available. Check if the task was merged into another record.

### "No asset linked to the task"

**Cause:** The asset field may be on the parent work order rather than the task itself.
**Solution:** Check the parent work order's `asset` and `cmdb_ci` fields. Some configurations store asset references only at the work order level.

### "Location coordinates missing"

**Cause:** Latitude and longitude are not populated on the location record.
**Solution:** Fall back to the street address for navigation. Suggest that the FSM administrator geocode location records for map integration.

### "Service history returns too many records"

**Cause:** High-maintenance assets may have hundreds of historical work orders.
**Solution:** Limit results to the last 5 work orders and summarize with a count. Use date filters to show only recent history (e.g., last 12 months).

## Examples

### Example 1: HVAC Maintenance Task Sidebar

**Scenario:** Technician opens task WMT0034521 on their mobile device en route to site.

**Step 1 - Get task:**
```
Tool: SN-Read-Record
Parameters:
  table_name: wm_task
  sys_id: abc123def456
  fields: sys_id,number,short_description,state,priority,work_order,location,asset,scheduled_start,estimated_work_duration,estimated_travel_duration
```

**Generated Sidebar:**
```
WMT0034521 - P3
Quarterly HVAC filter replacement and inspection
Status: Assigned | Work Est: 1.5 hrs

CUSTOMER:
Meridian Office Park
2100 Commerce Drive, Suite 400, Austin TX 78701
Contact: Robert Chen | (512) 555-0147

ASSET:
Carrier 50XC Rooftop Unit | S/N: CRR-2022-4401
Model: 50XC-A12 | Warranty: Active (exp Dec 2027)
Prior Service: 3 visits (last: Jan 15, 2026)

SLA: 6 hours remaining [=========>    ] 65%

LATEST NOTES:
- Mar 18: Filters pre-ordered, in tech's vehicle
- Mar 17: Customer confirmed 8 AM access available

CHECKLIST:
[ ] Badge required - check in at front desk
[ ] Roof access key from facilities manager
[ ] 2x MERV-13 filters loaded in van
```

### Example 2: Emergency Electrical Repair Sidebar

**Scenario:** Technician dispatched to an urgent electrical fault at a manufacturing facility.

```
WMT0034598 - P1 URGENT
Main distribution panel fault - partial power loss
Status: Accepted | Work Est: 3 hrs

CUSTOMER:
GlobalTech Manufacturing
8500 Industrial Blvd, Building C, Dallas TX 75247
Contact: Maria Santos (Plant Mgr) | (214) 555-0298

SAFETY WARNING:
High voltage equipment - PPE required
Lockout/tagout procedures mandatory

ASSET:
Eaton PRL4 Panel | S/N: ETN-2019-7782
Model: PRL4-Main-480V | Warranty: EXPIRED (Jun 2024)
Prior Service: 7 visits (last: Feb 28, 2026 - breaker trip)

SLA: 1.5 hours remaining [===============> ] 82%
RISK: SLA breach imminent

LATEST NOTES:
- Mar 19 09:15: Phase B showing intermittent faults
- Mar 19 08:45: Customer isolated affected circuits
- Mar 19 08:30: Dispatched as P1 emergency

CHECKLIST:
[ ] Arc flash PPE and insulated tools
[ ] Verify LOTO procedures with plant manager
[ ] Confirm backup power status
[ ] Multimeter and thermal imaging camera
```

## Related Skills

- `fsm/work-order-summarization` - Full work order summaries with complete task and parts detail
- `itsm/incident-lifecycle` - Related incident management for break-fix scenarios
- `cmdb/impact-analysis` - Assess downstream impact of CI maintenance
- `reporting/sla-analysis` - SLA tracking and compliance reporting
