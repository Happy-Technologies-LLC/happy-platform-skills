---
name: playbook-generation
version: 1.0.0
description: Generate Process Automation Designer playbooks from natural language descriptions including activities, lanes, conditions, data gathering steps, and both standard and agent-facing playbooks
author: Happy Technologies LLC
tags: [genai, playbook, process-automation, PAD, lanes, activities, agent-facing, data-gathering]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_process_flow
    - /api/now/table/sys_pd_activity
    - /api/now/table/sys_pd_lane
    - /api/now/table/sys_pd_transition
    - /api/now/table/sys_pd_context
    - /api/now/table/sys_pd_stage
    - /api/now/table/sys_pd_data_input
    - /api/now/table/sys_pd_playbook
    - /api/now/table/sys_hub_action_instance
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Process Automation Designer Playbook Generation

## Overview

This skill covers generating ServiceNow Process Automation Designer (PAD) playbooks from natural language descriptions:

- Creating standard playbooks for automated process execution
- Building agent-facing playbooks with guided interaction steps
- Defining lanes for parallel and sequential work streams
- Adding activities: data gathering, approvals, decisions, notifications
- Configuring data inputs and outputs for playbook context
- Setting up stage-based progression through multi-phase processes
- Connecting playbooks to catalog items, incidents, cases, and other record types

**When to use:** When building guided process automation, creating agent-facing workflows with data collection steps, or automating multi-lane business processes that require human and system interaction.

## Prerequisites

- **Roles:** `process_automation_designer` or `admin`
- **Plugins:** `com.snc.process_flow` (Process Automation Designer), `com.glide.hub.flow_designer` (Flow Designer)
- **Access:** sys_process_flow, sys_pd_activity, sys_pd_lane, sys_pd_transition tables
- **Knowledge:** Basic understanding of Process Automation concepts (playbooks, lanes, activities, stages)
- **Related Skills:** `genai/flow-generation` for Flow Designer flows, `genai/skill-kit-custom` for Now Assist skill integration

## Procedure

### Step 1: Analyze the Natural Language Description

Parse the user's request to identify:
- **Playbook type**: Standard (automated) or agent-facing (interactive)
- **Target table**: Which record type the playbook supports (incident, case, change_request, sc_req_item)
- **Lanes**: Parallel work streams or role-based separation of tasks
- **Activities**: Steps the playbook should execute (data collection, approvals, notifications, subflows)
- **Stages**: Major phases of the process (e.g., Triage, Investigation, Resolution)
- **Conditions**: Decision points and branching logic

### Step 2: Query Existing Playbooks for Patterns

**MCP Approach:**
```
Use SN-Query-Table on sys_process_flow:
  - query: active=true^sys_class_name=sys_pd_playbook
  - fields: sys_id,name,description,table,playbook_type,active,status
  - limit: 10
```

**REST Approach:**
```
GET /api/now/table/sys_process_flow
  ?sysparm_query=active=true^sys_class_name=sys_pd_playbook
  &sysparm_fields=sys_id,name,description,table,playbook_type,active,status
  &sysparm_limit=10
```

Query existing playbook activities for reusable patterns:
```
Use SN-Query-Table on sys_pd_activity:
  - query: playbook=<playbook_sys_id>
  - fields: sys_id,name,activity_type,lane,order,stage
  - limit: 50
```

### Step 3: Create the Playbook Record

**Standard Playbook (automated):**

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_playbook:
  - name: "Incident Resolution Playbook"
  - description: "Guides agents through structured incident resolution process"
  - table: "incident"
  - playbook_type: "standard"
  - status: "draft"
  - active: false
  - trigger_type: "record"
  - trigger_condition: "priority<=2^category=network"
```

**REST Approach:**
```
POST /api/now/table/sys_pd_playbook
Body: {
  "name": "Incident Resolution Playbook",
  "description": "Guides agents through structured incident resolution process",
  "table": "incident",
  "playbook_type": "standard",
  "status": "draft",
  "active": false,
  "trigger_type": "record",
  "trigger_condition": "priority<=2^category=network"
}
```

**Agent-Facing Playbook (interactive):**
```
Use SN-Create-Record on sys_pd_playbook:
  - name: "Customer Onboarding Playbook"
  - description: "Interactive playbook guiding agents through customer onboarding"
  - table: "sn_csm_case"
  - playbook_type: "agent_facing"
  - status: "draft"
  - active: false
```

### Step 4: Define Playbook Stages

Stages represent major phases of the process.

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_stage:
  - playbook: "<playbook_sys_id>"
  - name: "Triage"
  - label: "Triage"
  - order: 100
  - description: "Initial assessment and categorization"
```

```
Use SN-Create-Record on sys_pd_stage:
  - playbook: "<playbook_sys_id>"
  - name: "Investigation"
  - label: "Investigation"
  - order: 200
  - description: "Root cause analysis and troubleshooting"
```

```
Use SN-Create-Record on sys_pd_stage:
  - playbook: "<playbook_sys_id>"
  - name: "Resolution"
  - label: "Resolution"
  - order: 300
  - description: "Apply fix and verify resolution"
```

**REST Approach:**
```
POST /api/now/table/sys_pd_stage
Body: {
  "playbook": "<playbook_sys_id>",
  "name": "Triage",
  "label": "Triage",
  "order": 100,
  "description": "Initial assessment and categorization"
}
```

### Step 5: Create Lanes

Lanes define parallel work streams or role-based task groupings.

**Key lane types:**

| Lane Type | Description | Use Case |
|-----------|-------------|----------|
| System | Automated actions without user interaction | Background tasks, notifications |
| Agent | Tasks performed by the assigned agent | Data collection, manual steps |
| Approval | Approval-specific lane | Manager or CAB approvals |
| Customer | Customer-facing activities | Self-service data gathering |

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_lane:
  - playbook: "<playbook_sys_id>"
  - name: "Agent Lane"
  - lane_type: "agent"
  - order: 100
  - description: "Primary agent activities"
```

```
Use SN-Create-Record on sys_pd_lane:
  - playbook: "<playbook_sys_id>"
  - name: "System Lane"
  - lane_type: "system"
  - order: 200
  - description: "Automated background processing"
```

**REST Approach:**
```
POST /api/now/table/sys_pd_lane
Body: {
  "playbook": "<playbook_sys_id>",
  "name": "Agent Lane",
  "lane_type": "agent",
  "order": 100,
  "description": "Primary agent activities"
}
```

### Step 6: Add Activities

Activities are the individual steps within the playbook.

**Common activity types:**

| Activity Type | Value | Description |
|--------------|-------|-------------|
| Data Gathering | data_gathering | Collect information from user or agent |
| Decision | decision | Branch based on conditions |
| Approval | approval | Request approval from users |
| Notification | notification | Send email or push notification |
| Subflow | subflow | Execute a Flow Designer subflow |
| Update Record | update_record | Modify the playbook context record |
| Wait | wait | Pause until condition is met |
| Complete Stage | complete_stage | Mark a stage as finished |

**Data Gathering Activity (Agent-Facing):**

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_activity:
  - playbook: "<playbook_sys_id>"
  - lane: "<agent_lane_sys_id>"
  - stage: "<triage_stage_sys_id>"
  - name: "Gather Incident Details"
  - activity_type: "data_gathering"
  - order: 100
  - mandatory: true
  - description: "Collect key incident information from the caller"
```

**Decision Activity:**
```
Use SN-Create-Record on sys_pd_activity:
  - playbook: "<playbook_sys_id>"
  - lane: "<system_lane_sys_id>"
  - stage: "<triage_stage_sys_id>"
  - name: "Check Priority Level"
  - activity_type: "decision"
  - order: 200
  - condition: "current.priority <= 2"
  - description: "Route based on incident priority"
```

**Approval Activity:**
```
Use SN-Create-Record on sys_pd_activity:
  - playbook: "<playbook_sys_id>"
  - lane: "<approval_lane_sys_id>"
  - stage: "<investigation_stage_sys_id>"
  - name: "Manager Approval"
  - activity_type: "approval"
  - order: 300
  - approval_type: "approve_reject"
  - approvers: "current.assignment_group.manager"
  - due_date_interval: "2 days"
```

### Step 7: Configure Data Inputs for Activities

Data inputs define what information is collected in data gathering activities.

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_data_input:
  - activity: "<data_gathering_activity_sys_id>"
  - name: "affected_ci"
  - label: "Affected Configuration Item"
  - type: "reference"
  - reference_table: "cmdb_ci"
  - mandatory: true
  - order: 100
  - help_text: "Select the CI experiencing the issue"
```

```
Use SN-Create-Record on sys_pd_data_input:
  - activity: "<data_gathering_activity_sys_id>"
  - name: "impact_description"
  - label: "Business Impact"
  - type: "string"
  - mandatory: true
  - order: 200
  - help_text: "Describe how this incident impacts business operations"
```

```
Use SN-Create-Record on sys_pd_data_input:
  - activity: "<data_gathering_activity_sys_id>"
  - name: "users_affected"
  - label: "Number of Users Affected"
  - type: "integer"
  - mandatory: false
  - order: 300
```

**REST Approach:**
```
POST /api/now/table/sys_pd_data_input
Body: {
  "activity": "<data_gathering_activity_sys_id>",
  "name": "affected_ci",
  "label": "Affected Configuration Item",
  "type": "reference",
  "reference_table": "cmdb_ci",
  "mandatory": true,
  "order": 100
}
```

### Step 8: Define Transitions Between Activities

Transitions control the flow between activities including conditional routing.

**MCP Approach:**
```
Use SN-Create-Record on sys_pd_transition:
  - playbook: "<playbook_sys_id>"
  - source_activity: "<activity_1_sys_id>"
  - target_activity: "<activity_2_sys_id>"
  - condition: ""
  - order: 100
  - label: "Proceed to investigation"
```

**Conditional Transition (from Decision):**
```
Use SN-Create-Record on sys_pd_transition:
  - playbook: "<playbook_sys_id>"
  - source_activity: "<decision_activity_sys_id>"
  - target_activity: "<high_priority_activity_sys_id>"
  - condition: "result == 'yes'"
  - order: 100
  - label: "High Priority Path"
```

```
Use SN-Create-Record on sys_pd_transition:
  - playbook: "<playbook_sys_id>"
  - source_activity: "<decision_activity_sys_id>"
  - target_activity: "<standard_activity_sys_id>"
  - condition: "result == 'no'"
  - order: 200
  - label: "Standard Priority Path"
```

### Step 9: Set Up Playbook Context

Playbook context connects the playbook to runtime execution data.

**MCP Approach:**
```
Use SN-Query-Table on sys_pd_context:
  - query: playbook=<playbook_sys_id>
  - fields: sys_id,state,started_by,record,stage
  - limit: 10
```

Verify the playbook trigger configuration:
```
Use SN-Query-Table on sys_pd_playbook:
  - query: sys_id=<playbook_sys_id>
  - fields: trigger_type,trigger_condition,table,auto_start
```

### Step 10: Activate and Test the Playbook

**MCP Approach:**
```
Use SN-Update-Record on sys_pd_playbook:
  - sys_id: "<playbook_sys_id>"
  - status: "published"
  - active: true
```

Verify playbook is ready:
```
Use SN-Query-Table on sys_pd_playbook:
  - query: sys_id=<playbook_sys_id>
  - fields: sys_id,name,status,active,table
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Find existing playbooks and activities | Pattern discovery and validation |
| SN-Create-Record | Create playbooks, stages, lanes, activities | Building new playbook components |
| SN-Update-Record | Modify playbook settings, activate playbooks | Editing and publishing |
| SN-Get-Table-Schema | Discover playbook table fields | Understanding available configurations |

## Best Practices

1. **Always create playbooks in draft status** -- never publish untested playbooks directly
2. **Use descriptive stage names** that reflect business process phases, not technical steps
3. **Separate agent and system activities** into dedicated lanes for clarity
4. **Make data gathering fields mandatory** only when the information is truly required for the next step
5. **Add help text to data inputs** so agents understand what information to collect
6. **Use decision activities** instead of complex condition-based transitions for readability
7. **Limit the number of stages** to 3-5 for most playbooks to avoid agent confusion
8. **Test with sample records** that match trigger conditions before activating
9. **Set appropriate due dates** on approval activities to prevent process stalls
10. **Monitor playbook execution** via sys_pd_context for runtime analysis and bottleneck identification

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Playbook not starting | Trigger condition mismatch or playbook inactive | Verify sys_pd_playbook.active=true and trigger_condition matches record |
| Activity stuck in pending | Missing required data inputs or broken transition | Check sys_pd_data_input mandatory fields and sys_pd_transition links |
| Data gathering form empty | No data inputs linked to activity | Create sys_pd_data_input records referencing the activity |
| Lane not visible | Lane has no activities assigned | Add at least one activity to the lane |
| Stage progression blocked | Previous stage activities not completed | Verify all mandatory activities in current stage are complete |
| Playbook runs multiple times | No duplicate prevention on trigger | Add condition to exclude records with active playbook context |
| Approval not routing | Approver reference does not resolve | Verify approver field resolves to active user with approval role |

## Examples

### Example 1: Agent-Facing Incident Triage Playbook

Generate an interactive playbook for agents handling network incidents:
- **Trigger:** Record Created on `incident` where `category=network^priority<=2`
- **Stages:** Triage, Investigation, Resolution
- **Lane 1 (Agent):** Gather CI details, capture business impact, document troubleshooting steps
- **Lane 2 (System):** Auto-lookup related CIs, send notifications, update incident fields
- **Data Gathering:** Affected CI (reference to cmdb_ci), impact description (string), users affected (integer)
- **Decision:** If `users_affected > 100`, escalate to major incident process

### Example 2: Customer Onboarding Playbook

Generate a standard playbook for CSM customer onboarding:
- **Trigger:** Record Created on `sn_csm_case` where `case_type=onboarding`
- **Stages:** Welcome, Configuration, Training, Go-Live
- **Lane 1 (Agent):** Collect customer requirements, assign resources
- **Lane 2 (System):** Provision accounts, configure integrations, send welcome email
- **Lane 3 (Customer):** Complete intake form, schedule training sessions
- **Transitions:** Sequential stage progression with parallel lane execution

### Example 3: Change Request Risk Assessment Playbook

Generate a playbook for evaluating change request risk:
- **Trigger:** Record Updated on `change_request` where `state=assess`
- **Stages:** Risk Assessment, Approval, Scheduling
- **Lane 1 (Agent):** Complete risk questionnaire, document rollback plan
- **Lane 2 (Approval):** If risk=high, route to CAB; if moderate, route to manager
- **Data Gathering:** Risk score (integer), rollback plan (multi-line text), downtime estimate (duration)
- **Decision:** Branch based on calculated risk score to appropriate approval path

## Related Skills

- `genai/flow-generation` - Flow Designer flows for non-interactive automation
- `genai/spoke-generation` - Integration Hub spokes for external connections
- `genai/skill-kit-custom` - Custom Now Assist skills that can trigger playbooks
- `catalog/approval-workflows` - Catalog-specific approval configuration
- `itsm/incident-management` - Incident table structure and fields
