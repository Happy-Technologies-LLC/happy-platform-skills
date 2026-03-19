---
name: activity-response
version: 1.0.0
description: Generate contextual responses for CSM case activities including work notes, customer communications, and status updates with suggested next actions
author: Happy Technologies LLC
tags: [csm, activity, response, work-notes, status-update, agent-assist, next-actions]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_customerservice_task
    - /api/now/table/interaction
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_email
    - /api/now/table/sn_customerservice_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 3-10 minutes
---

# Activity Response

## Overview

This skill generates contextual responses for various CSM case activities, helping agents create consistent, comprehensive, and well-structured work notes, customer communications, and status updates. It helps you:

- Analyze current case state, recent activities, and pending actions to determine appropriate response content
- Generate professional work notes documenting investigation progress, findings, and decisions
- Create customer-facing additional comments with appropriate tone and detail level
- Suggest next actions based on case state, SLA status, and resolution progress
- Produce status update summaries for internal handoffs and management visibility
- Draft responses for common activity types: triage, investigation, escalation, awaiting info, and resolution

**When to use:** When a CSM agent needs to document case activity, update the customer on progress, create internal handoff notes, or determine and document the next steps in case resolution.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read/write access to `sn_customerservice_case`, `sys_journal_field`; read access to `sn_customerservice_task`, `interaction`, `kb_knowledge`, `sn_customerservice_sla`
- **Knowledge:** Familiarity with CSM case states, work note conventions, and your organization's case handling procedures

## Procedure

### Step 1: Retrieve Current Case State and Details

Fetch the case to understand the current situation and what type of activity response is needed.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolution_code,resolution_notes,escalation,severity,sla_due,contact_type,reassignment_count,reopen_count,cause,close_notes
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,resolved_at,resolution_code,resolution_notes,escalation,severity,sla_due,contact_type,reassignment_count,reopen_count,cause,close_notes&sysparm_display_value=true
```

### Step 2: Review Recent Activity History

Check what has already been done on the case to avoid duplicating information and to build on previous work.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on&sysparm_fields=element,value,sys_created_on,sys_created_by&sysparm_limit=20
```

### Step 3: Check Related Tasks and Their Status

Understand the status of any child tasks that may affect the case activity.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_task
  query: parent=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at,work_notes
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_task?sysparm_query=parent=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at&sysparm_limit=10&sysparm_display_value=true
```

### Step 4: Check SLA Status and Deadlines

Determine urgency based on SLA compliance to calibrate response priority.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<case_sys_id>^stage!=cancelled
  fields: sla,stage,has_breached,planned_end_time,percentage,business_percentage
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_sla?sysparm_query=task=<case_sys_id>^stage!=cancelled&sysparm_fields=sla,stage,has_breached,planned_end_time,percentage,business_percentage&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Review Recent Customer Communication

Check the latest customer communication to understand what they are expecting.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<case_sys_id>^type=received^ORDERBYDESCsys_created_on
  fields: sys_id,subject,body_text,sys_created_on
  limit: 3
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=<case_sys_id>^type=received^ORDERBYDESCsys_created_on&sysparm_fields=subject,body_text,sys_created_on&sysparm_limit=3
```

### Step 6: Search for Relevant Knowledge

Find KB articles that can support the activity response with solutions or references.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [short_description keywords]
  table: kb_knowledge
  limit: 3
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE<key_terms>&sysparm_fields=number,short_description,text&sysparm_limit=3&sysparm_display_value=true
```

### Step 7: Generate Activity Responses by Type

Based on the case state and context, generate the appropriate activity response.

#### Type A: Initial Triage Work Note

When a case is newly assigned and needs initial assessment:

```
=== WORK NOTE: INITIAL TRIAGE ===

Case [number] received and reviewed.

TRIAGE ASSESSMENT:
- Category: [category] / [subcategory]
- Impact: [impact] | Urgency: [urgency] | Priority: [priority]
- Product/Service: [product]
- Customer Tier: [tier]
- Contact Method: [contact_type]

INITIAL ANALYSIS:
[Summary of the reported issue based on description]

PRELIMINARY FINDINGS:
- [finding_1 based on case details]
- [finding_2 based on KB article match]
- [finding_3 based on similar cases]

NEXT STEPS:
1. [next_action_1 - e.g., "Request additional diagnostics from customer"]
2. [next_action_2 - e.g., "Check known issue KB0012345"]
3. [next_action_3 - e.g., "Engage product team if issue persists"]

SLA: [Response SLA target] | Expected follow-up by: [date]
```

#### Type B: Investigation Update Work Note

When documenting ongoing investigation progress:

```
=== WORK NOTE: INVESTIGATION UPDATE ===

Case [number] - Investigation in progress.

ACTIONS TAKEN:
1. [action_1 - e.g., "Reviewed application logs for the reported time window"]
2. [action_2 - e.g., "Confirmed issue is reproducible in test environment"]
3. [action_3 - e.g., "Consulted KB0034567 - partial match to known issue"]

FINDINGS:
- [finding_1]
- [finding_2]

CURRENT STATUS: [In Progress / Awaiting vendor response / Testing fix]
BLOCKERS: [None / Waiting for customer info / Pending vendor patch]

NEXT STEPS:
1. [next_action_1]
2. [next_action_2]

ESTIMATED RESOLUTION: [date or timeframe]
```

#### Type C: Customer-Facing Status Update

When updating the customer via additional comments:

```
=== ADDITIONAL COMMENT (CUSTOMER-VISIBLE) ===

Hello [contact_name],

Thank you for your patience regarding case [number].

Here is the latest update on your request:
- [status_summary in customer-friendly language]
- [what has been done]
- [what is happening next]

[If waiting for customer input:]
To help us proceed, could you please provide:
1. [requested_info_1]
2. [requested_info_2]

We expect to have [next update / resolution] by [date]. If you have
any questions in the meantime, please reply to this message.

Best regards,
[agent_name]
```

#### Type D: Escalation Work Note

When escalating the case:

```
=== WORK NOTE: ESCALATION ===

Case [number] escalated to [escalation_group] - Level [escalation_level].

ESCALATION REASON:
[reason - e.g., "Customer impact is broader than initially assessed" or
"Issue requires specialized product engineering knowledge"]

CASE HISTORY SUMMARY:
- Opened: [opened_at] | Age: [days] days
- Previous Assignment: [previous_group]
- Actions Taken: [summary of investigation to date]
- Customer Communications: [count] ([last_contact_date])
- SLA Status: [on_track/at_risk/breached]

WHAT HAS BEEN TRIED:
1. [action_1 and result]
2. [action_2 and result]
3. [action_3 and result]

WHAT IS NEEDED FROM ESCALATION TEAM:
1. [specific_ask_1]
2. [specific_ask_2]

CUSTOMER EXPECTATIONS: [what the customer expects and by when]
```

#### Type E: Awaiting Information Work Note

When the case is pending customer response:

```
=== WORK NOTE: AWAITING CUSTOMER INFO ===

Case [number] moved to Awaiting Info state.

INFORMATION REQUESTED:
1. [info_item_1] - Needed to [reason]
2. [info_item_2] - Needed to [reason]

COMMUNICATION SENT: [date] via [email/chat/phone]
FOLLOW-UP SCHEDULED: [date] if no response received

AUTO-CLOSE POLICY: Case will be auto-resolved after [X] days of
inactivity per policy [policy_reference].

RESUME ACTIONS (when customer responds):
1. [action_1]
2. [action_2]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Find KB articles relevant to the case activity |
| `SN-Query-Table` | Query journal entries, tasks, SLA data, emails |
| `SN-Read-Record` | Retrieve the case record or specific related records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Case details and state |
| `/api/now/table/sys_journal_field` | GET | Work notes and comments history |
| `/api/now/table/sn_customerservice_task` | GET | Related task status |
| `/api/now/table/interaction` | GET | Interaction history |
| `/api/now/table/sys_email` | GET | Email communication history |
| `/api/now/table/kb_knowledge` | GET | Knowledge base articles |
| `/api/now/table/sn_customerservice_sla` | GET | SLA compliance data |

## Best Practices

- **Separate internal and external notes:** Always use work notes for internal documentation and additional comments for customer-facing updates; never mix the two
- **Be specific in work notes:** Include exact timestamps, error messages, log references, and configuration values rather than vague descriptions
- **Document dead ends:** Record what was investigated and ruled out, not just what worked; this prevents future agents from repeating the same steps
- **Include next steps:** Every work note should end with clear next steps so any agent can pick up the case
- **Reference KB articles:** When a KB article was consulted, note the number and whether it applied or not
- **Use consistent formatting:** Follow a structured template for work notes so they are easy to scan during handoffs
- **Time-stamp actions:** Note when actions were performed, especially for SLA tracking purposes
- **Set follow-up dates:** When awaiting information, always set a specific follow-up date and document it in the work note
- **Summarize for escalations:** When escalating, provide a complete history summary so the receiving team doesn't have to read through all previous notes

## Troubleshooting

### "Cannot determine case state"

**Cause:** The case state field may use numeric values or custom states
**Solution:** Query with `sysparm_display_value=true` to get readable state names. Standard CSM states: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed. Check your instance for custom state values.

### "Work notes not saving"

**Cause:** ACL restrictions or mandatory field requirements
**Solution:** Verify the agent has `sn_customerservice_agent` role with write access to `sys_journal_field`. Check for any business rules requiring specific fields before journal entry.

### "SLA information not available"

**Cause:** SLA definitions may not be configured for this case type
**Solution:** Check `contract_sla` table for applicable SLA definitions matching the case's priority and assignment group. If no SLA exists, note this in the work note and use organizational guidelines for response targets.

### "Related tasks not found"

**Cause:** Tasks may be linked via a different relationship or parent field
**Solution:** Try querying with `parent.number=[case_number]` or check the `task_rel_task` table for M2M relationships between the case and tasks.

## Examples

### Example 1: Initial Triage of a Network Connectivity Case

**Scenario:** New P2 case assigned about intermittent network connectivity for a Gold tier customer.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0085001
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,product,contact,account,assigned_to,opened_at,sla_due
  limit: 1
```

**Step 2 - Search KB:**
```
Tool: SN-NL-Search
Parameters:
  query: intermittent network connectivity drops VPN
  table: kb_knowledge
  limit: 3
```

**Generated Work Note:**
```
INITIAL TRIAGE - CS0085001

Case reviewed. Customer reports intermittent network drops affecting
VPN connectivity, occurring 3-4 times daily since March 16.

TRIAGE ASSESSMENT:
- Category: Network / Connectivity
- Product: Enterprise VPN Gateway
- Customer: Meridian Corp (Gold Tier)
- Priority: P2 | Impact: Medium | Urgency: High

PRELIMINARY FINDINGS:
- KB0019876 describes similar VPN timeout issues related to MTU
  settings after firmware update 4.2.1
- Customer's description matches pattern of MTU fragmentation
- No current known outages for VPN Gateway service

NEXT STEPS:
1. Request VPN client logs from customer for affected timeframe
2. Check if customer's VPN Gateway is running firmware 4.2.1
3. If firmware matches, apply KB0019876 MTU fix procedure

SLA: Response due by Mar 19 14:00 | Follow-up scheduled: Mar 19 10:00
```

### Example 2: Escalation Documentation

**Scenario:** Case needs escalation after initial investigation failed to resolve the issue.

**Step 1 - Get case and history:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,state,priority,escalation,assigned_to,assignment_group,opened_at,reassignment_count
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<sys_id>^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 10
```

**Generated Work Note:**
```
ESCALATION - CS0085001

Escalating to Platform Engineering team - Level 2.

ESCALATION REASON:
Standard MTU fix (KB0019876) did not resolve the issue. Customer
continues to experience VPN drops. Root cause appears to be in the
gateway firmware requiring engineering investigation.

CASE SUMMARY (for receiving team):
- Opened: Mar 16 | Age: 3 days | Previous Group: Network Support
- Customer: Meridian Corp (Gold) | Contact: James Wright
- Issue: Intermittent VPN drops, 3-4x daily since Mar 16

WHAT HAS BEEN TRIED:
1. Applied MTU adjustment per KB0019876 - No improvement
2. Verified firmware version 4.2.1 - Confirmed current
3. Reviewed VPN client logs - Timeout errors at gateway level
4. Tested with alternate VPN profile - Same issue

WHAT IS NEEDED:
1. Gateway-level packet capture during failure window
2. Firmware team review of timeout handling in 4.2.1
3. Potential hotfix or rollback recommendation

CUSTOMER EXPECTATIONS: Resolution by Mar 21. Customer has a
board presentation on Mar 22 requiring stable VPN access.
SLA Status: On track (resolution SLA due Mar 23).
```

## Related Skills

- `csm/case-summarization` - Summarize full case context before generating activity notes
- `csm/email-recommendation` - Generate customer email updates based on activity
- `csm/sentiment-analysis` - Assess customer sentiment to calibrate communication tone
- `csm/resolution-notes` - Generate final resolution documentation when closing
- `csm/chat-recommendation` - Generate chat responses for real-time customer updates
