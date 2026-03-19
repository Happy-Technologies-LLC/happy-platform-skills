---
name: sidebar-summarization
version: 1.0.0
description: Generate sidebar summaries for customer service agents with case context, customer history, and recommended actions to accelerate case handling
author: Happy Technologies LLC
tags: [csm, sidebar, summarization, agent-assist, customer-history, recommendations]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/csm_consumer
    - /api/now/table/customer_account
    - /api/now/table/customer_contact
    - /api/now/table/sys_journal_field
    - /api/now/table/kb_knowledge
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Sidebar Summarization

## Overview

This skill generates concise sidebar summaries for customer service agents working in Agent Workspace. When an agent opens or is assigned a case, the sidebar summary provides instant context without requiring the agent to read through the entire case history. It covers:

- Generating a compact case overview with priority, status, and age
- Pulling customer history including past cases, interactions, and satisfaction scores
- Summarizing the consumer profile and account tier for entitlement context
- Identifying related or similar cases that may indicate a broader issue
- Recommending next-best actions based on case category and resolution patterns
- Highlighting SLA status and any escalation risks

**When to use:** When agents need rapid context upon accepting a case, during live chat or phone interactions, or when reviewing a queue of assigned cases.

**Value proposition:** Reduces average handle time by providing agents with pre-assembled case context, customer history, and actionable recommendations in a scannable sidebar format. Eliminates the need to manually navigate between multiple records to build context.

## Prerequisites

- **Plugins:** Customer Service Management (`com.sn_customerservice`) must be active
- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `csm_consumer`, `customer_account`, `customer_contact`, `sys_journal_field`, and `kb_knowledge` tables
- **Knowledge:** Familiarity with Agent Workspace sidebar components and CSM case lifecycle

## Procedure

### Step 1: Retrieve the Active Case Details

Fetch the case currently open in the agent's workspace.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,sla_due,escalation,contact_type,resolution_code
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,sla_due,escalation,contact_type,resolution_code&sysparm_display_value=true
```

### Step 2: Retrieve Consumer Profile

Fetch the consumer record to understand the customer's profile and history summary.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: csm_consumer
  query: sys_id=[consumer_sys_id]
  fields: sys_id,name,email,phone,location,account,customer_tier,notes,preferred_language,time_zone
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/csm_consumer/{consumer_sys_id}?sysparm_fields=sys_id,name,email,phone,location,account,customer_tier,notes,preferred_language,time_zone&sysparm_display_value=true
```

### Step 3: Pull Customer Account Context

Retrieve account-level details for entitlement and priority context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_id=[account_sys_id]
  fields: sys_id,name,number,customer_tier,industry,notes,phone,street,city,state,country,account_code
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/customer_account/{account_sys_id}?sysparm_fields=sys_id,name,number,customer_tier,industry,notes,phone,account_code&sysparm_display_value=true
```

### Step 4: Retrieve Customer Case History

Query recent cases for the same consumer or account to identify patterns.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: consumer=[consumer_sys_id]^sys_id!=[current_case_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,priority,category,opened_at,closed_at,resolution_code
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=consumer=[consumer_sys_id]^sys_id!=[current_case_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,short_description,state,priority,category,opened_at,closed_at,resolution_code&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Retrieve Recent Interactions

Pull the latest interactions for the case and the consumer.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=[case_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction
  limit: 5
```

For consumer-level interaction history:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: opened_for=[consumer_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,channel,state,opened_at,short_description
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=parent=[case_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction&sysparm_limit=5&sysparm_display_value=true

GET /api/now/table/interaction?sysparm_query=opened_for=[consumer_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,channel,state,opened_at,short_description&sysparm_limit=10&sysparm_display_value=true
```

### Step 6: Check for Related Knowledge Articles

Search for knowledge articles matching the case category and product.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [case_short_description]
  table: kb_knowledge
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=topic=[case_category]^workflow_state=published^ORDERBYDESCsys_view_count&sysparm_fields=sys_id,number,short_description,kb_knowledge_base,sys_view_count,rating&sysparm_limit=5&sysparm_display_value=true
```

### Step 7: Retrieve Latest Work Notes

Pull the most recent work notes for quick context on current progress.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^element=work_notes^ORDERBYDESCsys_created_on
  fields: sys_id,value,sys_created_on,sys_created_by
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,value,sys_created_on,sys_created_by&sysparm_limit=5
```

### Step 8: Assemble the Sidebar Summary

Compile all gathered data into a compact sidebar format:

```
=== SIDEBAR SUMMARY ===
CASE: CS0012345 | P2 | In Progress
Issue: Unable to process returns through online portal
Age: 4 days | SLA Due: Mar 21 14:00 (On Track)
Channel: Phone | Escalation: Normal

CUSTOMER SNAPSHOT:
Name: Jane Smith | Account: Acme Corp (Gold Tier)
Preferred Language: English | Timezone: US/Eastern
Contact: jane.smith@acme.com | +1-555-0123

CASE HISTORY (Last 90 days):
- 3 total cases | 2 resolved | 1 open (this case)
- Common categories: Portal Issues (2), Billing (1)
- Avg resolution time: 3.2 days

RECENT ACTIVITY:
- Mar 18: Agent reviewed portal logs, found session timeout
- Mar 17: Customer provided browser details

RECOMMENDED ACTIONS:
1. Review KB0045123: "Portal Session Timeout Troubleshooting"
2. Check related defect DEF0034521 for fix status
3. Consider escalation if not resolved by Mar 20

RELATED KB ARTICLES:
- KB0045123: Portal session management (42 views)
- KB0045089: Browser compatibility guide (28 views)
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language lookup for cases, consumers, or knowledge articles |
| `SN-Query-Table` | Structured queries across case, interaction, consumer, and KB tables |
| `SN-Read-Record` | Retrieve a single case or consumer record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query case records |
| `/api/now/table/interaction` | GET | Retrieve case and consumer interactions |
| `/api/now/table/csm_consumer` | GET | Consumer profile details |
| `/api/now/table/customer_account` | GET | Account tier and entitlement info |
| `/api/now/table/customer_contact` | GET | Contact preferences and details |
| `/api/now/table/sys_journal_field` | GET | Work notes and comments |
| `/api/now/table/kb_knowledge` | GET | Knowledge article recommendations |

## Best Practices

- **Keep summaries concise:** Sidebar space is limited; aim for scannable bullet points rather than paragraphs
- **Prioritize actionable information:** Lead with status, SLA risk, and recommended next steps
- **Show customer sentiment:** If sentiment analysis data is available, include the latest sentiment score
- **Highlight repeat contacts:** Flag if the customer has contacted support multiple times for the same issue
- **Include entitlement context:** Account tier affects SLA targets and available support channels
- **Refresh on case update:** Sidebar summaries should be regenerated when significant case changes occur
- **Respect privacy:** Only display customer PII appropriate for the agent's role and jurisdiction
- **Calculate case age dynamically:** Display age in human-readable format (hours, days) relative to current time

## Troubleshooting

### "Consumer record not found"

**Cause:** The case may not have a consumer linked, or the consumer was created as an anonymous contact.
**Solution:** Fall back to the `contact` field on the case. Query `customer_contact` instead of `csm_consumer` using the contact sys_id.

### "No case history available"

**Cause:** This may be the customer's first case, or historical cases are archived.
**Solution:** Expand the search to account-level cases using `account=[account_sys_id]` instead of filtering by consumer.

### "Knowledge articles not relevant"

**Cause:** The category-based search may return generic articles.
**Solution:** Use `SN-NL-Search` with the case short_description for semantic matching. Combine category and product filters for more targeted results.

### "SLA information missing"

**Cause:** SLA definitions may not be configured for the case type or priority.
**Solution:** Query `task_sla` with `task=[case_sys_id]` to check if SLAs are attached. Consult CSM admin if SLAs are tracked externally.

### "Interaction records return empty"

**Cause:** Interactions may be stored with a different parent reference or the channel integration may not create interaction records.
**Solution:** Check if interactions use `document` instead of `parent` as the reference field. Also query `sys_journal_field` for comments that may capture interaction history.

## Examples

### Example 1: Live Chat Sidebar Context

**Scenario:** Agent accepts an incoming chat and needs instant context.

**Step 1 - Get case from interaction:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: sys_id=[interaction_sys_id]
  fields: parent,opened_for,channel
  limit: 1
```

**Step 2 - Build sidebar from parent case:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [parent_sys_id]
  fields: number,short_description,state,priority,consumer,account,category,opened_at,sla_due
```

**Output:**
```
LIVE CHAT CONTEXT
Case: CS0078901 | P3 | New
Issue: Billing discrepancy on March invoice
Customer: Robert Chen | TechStart Inc (Silver)
Previous cases: 1 (resolved - similar billing issue in Jan)
Suggested KB: KB0067890 - Invoice reconciliation guide
```

### Example 2: Queue Review Sidebar Summaries

**Scenario:** Agent reviewing their assigned case queue needs summaries for each case.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: assigned_to=[agent_sys_id]^stateIN1,2,10^ORDERBYpriority
  fields: sys_id,number,short_description,state,priority,consumer,account,category,opened_at,sla_due,escalation
  limit: 20
```

**Output:**
```
QUEUE SUMMARY (5 cases assigned)

1. CS0078901 | P1 | SLA: 2hrs remaining | Acme Corp (Gold)
   Production outage - API gateway errors
   ACTION: Immediate attention required

2. CS0078905 | P2 | SLA: On Track | Globex (Silver)
   Password reset failing for SSO users
   ACTION: Check KB0045200, likely config issue

3. CS0078910 | P3 | SLA: On Track | Initech (Bronze)
   Feature request - export to CSV
   ACTION: Route to product team for evaluation
```

### Example 3: Escalated Case Sidebar

**Scenario:** A P1 escalated case requires executive-level summary with full customer context.

```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,state,priority,escalation,consumer,account,category,opened_at,sla_due,assigned_to,assignment_group
```

**Output:**
```
ESCALATED CASE SUMMARY
Case: CS0099001 | P1 CRITICAL | Escalated
Issue: Complete service outage affecting all users
Account: MegaCorp Industries (Platinum Tier)
Age: 6 hours | SLA: BREACHED (4hr target)
Escalation Level: 2 | Assigned: Sr. Engineer Team
Customer Impact: 500+ users affected
Previous escalations: 0 in last 12 months
EXEC ALERT: Platinum account - VP notification required
```

## Related Skills

- `csm/case-summarization` - Full case summarization with complete timeline
- `csm/sentiment-analysis` - Customer sentiment analysis across communications
- `csm/chat-recommendation` - Generate chat response recommendations
- `csm/suggested-steps` - AI-generated resolution step recommendations
- `csm/trending-topics` - Trending topic analysis across case portfolio
- `knowledge/content-recommendation` - Knowledge article recommendations
