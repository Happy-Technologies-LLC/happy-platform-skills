---
name: case-summarization
version: 1.0.0
description: Summarize CSM cases including timeline, interactions, resolution status, related tasks, and communications history
author: Happy Technologies LLC
tags: [csm, case, summarization, customer-service, timeline, analysis]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/sn_customerservice_task
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_email
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Case Summarization

## Overview

This skill provides a structured approach to generating comprehensive summaries of Customer Service Management (CSM) cases in ServiceNow. It helps you:

- Retrieve and consolidate all case details including contact, account, and product information
- Build a chronological timeline of interactions, activities, and communications
- Identify current resolution status and any pending actions
- Summarize related tasks, child cases, and escalation history
- Produce a concise executive summary suitable for handoffs or management review

**When to use:** When a CSM agent needs a quick overview of a case for shift handover, escalation review, management reporting, or returning to a case after time away.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `sn_customerservice_task`, `sys_journal_field`, and `sys_email` tables
- **Knowledge:** Familiarity with CSM case lifecycle states and your organization's case categories

## Procedure

### Step 1: Retrieve Core Case Details

Fetch the primary case record with all relevant fields.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolved_by,closed_at,closed_by,resolution_code,resolution_notes,escalation,severity,sla_due,business_duration,calendar_duration,reassignment_count,reopen_count,contact_type
```

If you only have the case number, search first:

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0012345
  fields: sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,resolved_at,closed_at,resolution_code,resolution_notes,escalation,severity,contact_type
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=number=CS0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,resolved_at,closed_at,resolution_code,resolution_notes,escalation,severity,contact_type&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Customer and Account Context

Get the customer account and contact information to provide context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_id=[account_sys_id]
  fields: sys_id,name,number,account_code,industry,customer,notes,street,city,state,country,phone,customer_tier
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: customer_contact
  query: sys_id=[contact_sys_id]
  fields: sys_id,name,email,phone,title,account,timezone,preferred_contact_method
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/customer_account/{account_sys_id}?sysparm_fields=sys_id,name,number,account_code,industry,customer_tier,phone&sysparm_display_value=true

GET /api/now/table/customer_contact/{contact_sys_id}?sysparm_fields=sys_id,name,email,phone,title,preferred_contact_method&sysparm_display_value=true
```

### Step 3: Gather Interaction History

Retrieve all interactions (phone calls, chats, portal submissions) linked to the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=<case_sys_id>^ORDERBYDESCopened_at
  fields: sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction,duration
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=parent=<case_sys_id>^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction,duration&sysparm_limit=50&sysparm_display_value=true
```

### Step 4: Retrieve Case Activities and Work Notes

Pull journal entries (work notes, additional comments) to build the activity timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by&sysparm_limit=100
```

### Step 5: Check Related Tasks and Child Cases

Identify any child tasks or related cases.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_task
  query: parent=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at
  limit: 20
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: parent=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,state,priority,opened_at,closed_at
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_task?sysparm_query=parent=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at&sysparm_limit=20&sysparm_display_value=true

GET /api/now/table/sn_customerservice_case?sysparm_query=parent=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,short_description,state,priority,opened_at,closed_at&sysparm_limit=10&sysparm_display_value=true
```

### Step 6: Retrieve Email Communications

Pull email records associated with the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,subject,type,recipients,sys_created_on,sys_created_by,direct,content_type
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,subject,type,recipients,sys_created_on,sys_created_by,direct&sysparm_limit=30&sysparm_display_value=true
```

### Step 7: Build the Case Summary

Assemble all collected data into a structured summary:

```
=== CASE SUMMARY ===
Case Number: CS0012345
Status: [state] | Priority: [priority] | Severity: [severity]
Opened: [opened_at] | Duration: [business_duration]

CUSTOMER CONTEXT:
Account: [account_name] (Tier: [customer_tier])
Contact: [contact_name] | [email] | [phone]
Product: [product] | Asset: [asset]
Contact Method: [contact_type]

ISSUE DESCRIPTION:
[short_description]
[description - first 500 chars]

TIMELINE: (most recent first)
[date] - [activity_type]: [summary_of_entry]
[date] - [activity_type]: [summary_of_entry]
...

INTERACTIONS: [count] total
- [date] [channel] ([direction]): [short_description] - [state]
...

RELATED TASKS: [count] total ([open_count] open, [closed_count] closed)
- [task_number]: [short_description] - [state]
...

EMAILS: [count] total ([inbound_count] inbound, [outbound_count] outbound)
- [date] [type]: [subject]
...

RESOLUTION STATUS:
State: [state]
Resolution Code: [resolution_code]
Resolution Notes: [resolution_notes]
Reassignment Count: [reassignment_count]
Reopen Count: [reopen_count]

KEY OBSERVATIONS:
- [escalation status]
- [SLA status]
- [pending items]
- [risk factors]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language case lookup (e.g., "find open P1 cases for Acme Corp") |
| `SN-Query-Table` | Structured queries across case, interaction, task, email tables |
| `SN-Read-Record` | Retrieve a single record by sys_id with all fields |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query case records |
| `/api/now/table/interaction` | GET | Retrieve case interactions |
| `/api/now/table/sn_customerservice_task` | GET | Get related tasks |
| `/api/now/table/sys_journal_field` | GET | Pull work notes and comments |
| `/api/now/table/sys_email` | GET | Retrieve email communications |
| `/api/now/table/customer_account` | GET | Customer account details |
| `/api/now/table/customer_contact` | GET | Contact details |

## Best Practices

- **Use display values:** Always pass `sysparm_display_value=true` in REST calls to get readable names instead of sys_ids
- **Limit journal entries:** Work notes can be very long; summarize rather than including full text
- **Check SLA status:** Always note if the case is approaching or has breached SLA targets
- **Identify patterns:** Look for repeated reassignments or reopens as indicators of complexity
- **Respect privacy:** Omit sensitive personal data from summaries shared with non-authorized personnel
- **Note escalation history:** Highlight any escalation changes and the reasons behind them

## Troubleshooting

### "Case not found"

**Cause:** Case number format incorrect or case is in a different scope
**Solution:** Verify the prefix (CS vs CSM vs other) and check if the case exists in a different application scope. Try searching with `numberLIKECS001234`.

### "No interactions found"

**Cause:** Interactions may be linked via a different relationship field
**Solution:** Check the `parent` and `document_id` fields on interaction. Also query with `document=sn_customerservice_case^document_id=<case_sys_id>`.

### "Journal entries are empty"

**Cause:** Journal fields are stored separately and may require explicit access
**Solution:** Ensure your role has access to `sys_journal_field`. Try the case REST API with `sysparm_fields=work_notes,comments` which returns journal directly.

### "Cannot read customer account"

**Cause:** Account record is in a restricted scope or has ACL restrictions
**Solution:** Verify you have the `customer_account_read` or `sn_customerservice_agent` role.

## Examples

### Example 1: Open Case Summary for Shift Handover

**Scenario:** Agent needs a quick summary of case CS0056789 before taking over from a colleague.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0056789
  fields: sys_id,number,short_description,state,priority,category,contact,account,assigned_to,assignment_group,opened_at,escalation
  limit: 1
```

**Step 2 - Get recent work notes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<sys_id>^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 10
```

**Output Summary:**
```
CASE CS0056789 - SHIFT HANDOVER SUMMARY
Status: In Progress | Priority: P2 | Escalation: Normal
Customer: Acme Corp (Tier: Gold) | Contact: Jane Smith
Issue: Unable to process returns through online portal
Opened: 2026-03-15 09:30 | Age: 4 days

RECENT ACTIVITY:
- Mar 18: Agent reviewed portal logs, identified session timeout issue
- Mar 17: Customer provided browser details and screenshots
- Mar 16: Initial triage, assigned to Portal Support team
- Mar 15: Case created via phone interaction

PENDING: Awaiting fix deployment for session timeout bug (DEF0034521)
```

### Example 2: Escalated Case Executive Summary

**Scenario:** Manager requests a summary of all P1 escalated cases for a key account.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: account=<account_sys_id>^priority=1^escalation!=0^stateNOT IN6,7
  fields: number,short_description,state,priority,escalation,assigned_to,opened_at,sla_due
  limit: 10
```

**Output:**
```
ESCALATED P1 CASES - GLOBEX CORPORATION
Total: 3 active P1 cases

1. CS0045001 - Production API gateway returning 503 errors
   State: In Progress | Escalated: Level 2 | SLA Due: Mar 19 14:00
   Owner: David Chen (Platform Support)

2. CS0045123 - Batch processing failure affecting invoicing
   State: Awaiting Info | Escalated: Level 1 | SLA Due: Mar 20 09:00
   Owner: Sarah Kim (Data Services)

3. CS0045200 - SSO authentication failing intermittently
   State: In Progress | Escalated: Level 3 | SLA Due: Mar 19 10:00
   Owner: Mike Johnson (Identity Team)

RISK: CS0045200 is at Level 3 escalation with SLA due in 2 hours.
```

## Related Skills

- `csm/resolution-notes` - Generate resolution documentation for case closure
- `csm/sentiment-analysis` - Analyze customer sentiment across case communications
- `csm/activity-response` - Generate contextual responses for case activities
- `itsm/incident-lifecycle` - Related incident management processes
- `reporting/sla-analysis` - SLA tracking and reporting
