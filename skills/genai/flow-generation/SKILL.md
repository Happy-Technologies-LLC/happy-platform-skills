---
name: flow-generation
version: 1.0.0
description: Generate ServiceNow Flow Designer flows from natural language descriptions including triggers, actions, conditions, subflows, approval flows, notification flows, and data manipulation flows
author: Happy Technologies LLC
tags: [genai, flow-designer, automation, flows, triggers, actions, subflows, approvals, notifications]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_hub_flow
    - /api/now/table/sys_hub_action_type_definition
    - /api/now/table/sys_flow
    - /api/now/table/sys_hub_action_instance
    - /api/now/table/sys_hub_trigger_instance
    - /api/now/table/sys_hub_flow_input
    - /api/now/table/sys_hub_flow_output
    - /api/now/table/sys_hub_sub_flow
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Flow Designer Flow Generation

## Overview

This skill covers generating ServiceNow Flow Designer flows from natural language descriptions:

- Creating flows with appropriate triggers (record-based, scheduled, application-based)
- Adding actions: approvals, notifications, record operations, scripted steps
- Building conditional logic with if/else branches and decision tables
- Creating subflows for reusable automation components
- Generating approval flows with parallel/sequential approval patterns
- Building notification flows with dynamic content
- Data manipulation flows for record transformations and bulk operations

**When to use:** When automating business processes, generating approval workflows, building notification logic, or creating data manipulation pipelines in Flow Designer.

## Prerequisites

- **Roles:** `flow_designer` or `admin`
- **Plugins:** `com.glide.hub.flow_designer` (Flow Designer), `com.glide.hub.action_type` (Action Designer)
- **Access:** sys_hub_flow, sys_hub_action_type_definition, sys_flow tables
- **Knowledge:** Basic understanding of Flow Designer concepts (triggers, actions, flow logic)
- **Related Skills:** `genai/playbook-generation` for Process Automation, `genai/spoke-generation` for integrations

## Procedure

### Step 1: Analyze the Natural Language Description

Parse the user's request to identify:
- **Trigger type**: What starts the flow (record create/update, schedule, inbound email, REST)
- **Target table**: Which table the flow operates on
- **Actions**: What the flow should do (create records, send notifications, request approvals)
- **Conditions**: Any branching logic or filters
- **Outputs**: Expected results or return values

### Step 2: Query Existing Flows for Patterns

**MCP Approach:**
```
Use SN-Query-Table on sys_hub_flow:
  - query: active=true^trigger_type=RECORD_CREATED^table=incident
  - fields: sys_id,name,description,trigger_type,table,status
  - limit: 10
```

**REST Approach:**
```
GET /api/now/table/sys_hub_flow
  ?sysparm_query=active=true^trigger_type=RECORD_CREATED^table=incident
  &sysparm_fields=sys_id,name,description,trigger_type,table,status
  &sysparm_limit=10
```

### Step 3: Create the Flow Record

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_flow:
  - name: "Auto-Assign Priority Incidents"
  - description: "Automatically assigns high-priority incidents to the on-call team"
  - trigger_type: "RECORD_CREATED"
  - table: "incident"
  - status: "draft"
  - run_as: "system"
  - scope: "global"
```

**REST Approach:**
```
POST /api/now/table/sys_hub_flow
Body: {
  "name": "Auto-Assign Priority Incidents",
  "description": "Automatically assigns high-priority incidents to the on-call team",
  "trigger_type": "RECORD_CREATED",
  "table": "incident",
  "status": "draft",
  "run_as": "system",
  "scope": "global"
}
```

### Step 4: Configure the Trigger

**Key trigger types and their configurations:**

| Trigger Type | Value | Configuration Fields |
|-------------|-------|---------------------|
| Record Created | RECORD_CREATED | table, conditions |
| Record Updated | RECORD_UPDATED | table, conditions, fields_to_monitor |
| Record Deleted | RECORD_DELETED | table, conditions |
| Scheduled | SCHEDULED | schedule, time_zone, repeat_interval |
| Inbound Email | INBOUND_EMAIL | target_table, conditions |
| REST API | REST | endpoint_path, http_method |
| Service Catalog | SC_REQ_ITEM | catalog_item, conditions |

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_trigger_instance:
  - flow: "<flow_sys_id>"
  - trigger_type: "RECORD_UPDATED"
  - table: "incident"
  - condition: "priority=1^state!=6"
  - fields_to_monitor: "priority,assignment_group"
```

**REST Approach:**
```
POST /api/now/table/sys_hub_trigger_instance
Body: {
  "flow": "<flow_sys_id>",
  "trigger_type": "RECORD_UPDATED",
  "table": "incident",
  "condition": "priority=1^state!=6",
  "fields_to_monitor": "priority,assignment_group"
}
```

### Step 5: Add Flow Actions

**Common action types and their sys_hub_action_type_definition references:**

| Action | Type Definition | Key Inputs |
|--------|----------------|------------|
| Create Record | sn_fd.create_record | table, field_values |
| Update Record | sn_fd.update_record | record, field_values |
| Delete Record | sn_fd.delete_record | record |
| Look Up Record | sn_fd.look_up_record | table, conditions |
| Ask for Approval | sn_fd.ask_for_approval | record, approvers, approval_type |
| Send Email | sn_fd.send_email | to, subject, body |
| Send Notification | sn_fd.send_notification | notification, recipients |
| Log Message | sn_fd.log | message, level |
| Run Script | sn_fd.run_script | script |
| Wait for Condition | sn_fd.wait_for_condition | table, condition, timeout |

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_action_instance:
  - flow: "<flow_sys_id>"
  - action_type: "<action_type_sys_id>"
  - order: 100
  - name: "Look Up Assignment Group"
  - inputs: {
      "table": "sys_user_group",
      "conditions": "name=Network Operations"
    }
```

### Step 6: Add Conditional Logic

Build if/else branches using flow logic steps:

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_action_instance:
  - flow: "<flow_sys_id>"
  - action_type: "sn_fd.if"
  - order: 200
  - name: "Check Priority Level"
  - inputs: {
      "condition": "trigger.current.priority == 1"
    }
```

For nested conditions, use the `parent` field to link child actions to the if/else block.

### Step 7: Build Approval Flows

**Sequential Approval Pattern:**
```
Use SN-Create-Record on sys_hub_action_instance:
  - flow: "<flow_sys_id>"
  - action_type: "sn_fd.ask_for_approval"
  - order: 300
  - name: "Manager Approval"
  - inputs: {
      "record": "trigger.current",
      "approval_type": "approve_reject",
      "approvers": "trigger.current.opened_by.manager",
      "due_date_interval": "3 days"
    }
```

**Parallel Approval Pattern:**
Add multiple approval actions inside a parallel block:
```
Use SN-Create-Record on sys_hub_action_instance:
  - flow: "<flow_sys_id>"
  - action_type: "sn_fd.parallel"
  - order: 300
  - name: "Parallel Approvals"
```

Then add child approval actions with `parent` referencing the parallel block.

### Step 8: Create Subflows for Reusability

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_sub_flow:
  - name: "Send Escalation Notification"
  - description: "Reusable subflow for sending escalation notifications"
  - status: "draft"
  - inputs: "record,escalation_level,notify_group"
  - access: "public"
```

**REST Approach:**
```
POST /api/now/table/sys_hub_sub_flow
Body: {
  "name": "Send Escalation Notification",
  "description": "Reusable subflow for sending escalation notifications",
  "status": "draft",
  "access": "public"
}
```

### Step 9: Define Flow Inputs and Outputs

**MCP Approach:**
```
Use SN-Create-Record on sys_hub_flow_input:
  - flow: "<flow_sys_id>"
  - name: "assignment_group"
  - label: "Assignment Group"
  - type: "reference"
  - reference_table: "sys_user_group"
  - mandatory: true
```

```
Use SN-Create-Record on sys_hub_flow_output:
  - flow: "<flow_sys_id>"
  - name: "approval_status"
  - label: "Approval Status"
  - type: "string"
```

### Step 10: Activate and Test the Flow

**MCP Approach:**
```
Use SN-Update-Record on sys_hub_flow:
  - sys_id: "<flow_sys_id>"
  - status: "published"
```

Verify the flow is active:
```
Use SN-Query-Table on sys_hub_flow:
  - query: sys_id=<flow_sys_id>
  - fields: sys_id,name,status,active
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing flows and action types | Pattern discovery and validation |
| SN-Create-Record | Create flows, triggers, actions | Building new flow components |
| SN-Update-Record | Modify flow settings, activate flows | Editing and publishing |
| SN-Get-Table-Schema | Discover flow table fields | Understanding available configurations |

## Best Practices

1. **Always create flows in draft status first** -- never publish untested flows directly
2. **Use descriptive names** for flows and actions that reflect business purpose
3. **Set run_as appropriately** -- use "system" for background automation, "initiating_user" for user-triggered flows
4. **Add error handling** -- include try/catch blocks and log actions for debugging
5. **Limit trigger conditions** -- overly broad triggers cause performance issues
6. **Use subflows** for repeated logic across multiple flows
7. **Monitor flow execution** via sys_flow_context for runtime analysis
8. **Set appropriate timeouts** on Wait for Condition actions to prevent indefinite hangs
9. **Test with restricted data** before activating against production tables
10. **Document flow purpose** in the description field for maintainability

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Flow not triggering | Trigger conditions too restrictive or flow inactive | Check sys_hub_flow.active and trigger conditions |
| Action fails with permission error | Run-as user lacks table access | Change run_as or grant roles to flow user |
| Flow executes multiple times | Trigger lacks update-field filter | Add fields_to_monitor to limit re-triggers |
| Subflow not found | Subflow is in draft or wrong scope | Publish subflow and check access setting |
| Approval stuck in pending | No approvers matched | Verify approver reference resolves to active users |
| Flow context shows error | Script action has runtime exception | Check sys_flow_context.error_message for details |

## Examples

### Example 1: Incident Auto-Assignment Flow
Generate a flow that automatically assigns P1 incidents to the Network Operations team and sends a notification:
- Trigger: Record Created on `incident` where `priority=1`
- Action 1: Look Up Record on `sys_user_group` where `name=Network Operations`
- Action 2: Update Record on trigger record setting `assignment_group` to lookup result
- Action 3: Send Notification to assignment group members

### Example 2: Change Request Approval Flow
Generate a multi-level approval flow for change requests:
- Trigger: Record Updated on `change_request` where `state=assess`
- Action 1: If `risk=high`, request CAB approval (parallel)
- Action 2: If `risk=moderate`, request manager approval (sequential)
- Action 3: On approval, update state to `authorize`
- Action 4: On rejection, update state to `closed` with rejection notes

### Example 3: Scheduled Data Cleanup Flow
Generate a scheduled flow to archive old resolved incidents:
- Trigger: Scheduled, daily at 02:00 UTC
- Action 1: Look Up Records on `incident` where `state=6^resolved_at<javascript:gs.daysAgo(90)`
- Action 2: For each record, create archive record in `u_incident_archive`
- Action 3: Delete original record
- Action 4: Log summary of archived count

## Related Skills

- `genai/playbook-generation` - Process Automation Designer playbooks
- `genai/spoke-generation` - Integration Hub spoke creation
- `catalog/approval-workflows` - Catalog-specific approval configuration
- `itsm/incident-management` - Incident table structure and fields
