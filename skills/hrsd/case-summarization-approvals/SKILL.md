---
name: case-summarization-approvals
version: 1.0.0
description: Summarize HR cases, service requests, and requested items for approvers with business justification, cost impact, approval history context, and policy compliance information
author: Happy Technologies LLC
tags: [hrsd, approvals, case-summarization, business-justification, cost-impact, approval-history, compliance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-NL-Search
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sysapproval_approver
    - /api/now/table/sc_req_item
    - /api/now/table/sc_request
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/task_sla
    - /api/now/table/sys_journal_field
    - /api/now/table/fx_price
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Case Summarization for Approvals

## Overview

This skill generates approval-focused summaries for HR cases, service requests, and requested items. It provides approvers with the context they need to make informed decisions:

- Extracting and highlighting business justification from request details and variables
- Calculating cost impact including recurring costs, one-time charges, and budget implications
- Building approval history timelines showing who approved, rejected, or is pending
- Surfacing policy compliance status and any flagged exceptions
- Summarizing the requester's profile, department context, and prior similar requests
- Identifying risk factors that may warrant additional scrutiny

**When to use:** When approvers need concise, decision-ready summaries of pending approvals, or when building automated approval notification enrichment for HR and IT requests.

## Prerequisites

- **Roles:** `approver_user`, `sn_hr_core.case_reader`, `itil`, or `admin`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.glideapp.servicecatalog` (Service Catalog)
- **Access:** Read access to `sysapproval_approver`, `sn_hr_core_case`, `sc_req_item`, `sc_request`, `sn_hr_core_profile`
- **Knowledge:** Approval process concepts, HR case lifecycle, catalog request variables

## Procedure

### Step 1: Retrieve the Pending Approval Record

Fetch the approval record to identify the source document and approval context.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: approver=<user_sys_id>^state=requested^ORDERBYDESCsys_created_on
  fields: sys_id,sysapproval,source_table,state,approver,group,sys_created_on,due_date,expected_start,comments
  limit: 20
```

**REST Approach:**
```
GET /api/now/table/sysapproval_approver
  ?sysparm_query=approver=<user_sys_id>^state=requested^ORDERBYDESCsys_created_on
  &sysparm_fields=sys_id,sysapproval,source_table,state,approver,group,sys_created_on,due_date,comments
  &sysparm_display_value=true
  &sysparm_limit=20
```

### Step 2: Retrieve the Source Record Details

Based on the `source_table`, fetch the underlying request or case.

**For HR Cases:**

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_hr_core_case
  sys_id: <sysapproval_value>
  fields: sys_id,number,short_description,description,state,priority,opened_by,opened_at,subject_person,hr_service,assignment_group,u_business_justification,u_cost_estimate
```

**For Requested Items (sc_req_item):**
```
Tool: SN-Get-Record
Parameters:
  table_name: sc_req_item
  sys_id: <sysapproval_value>
  fields: sys_id,number,short_description,description,cat_item,requested_for,price,recurring_price,quantity,variables,opened_at,opened_by,request,stage
```

**REST Approach:**
```
GET /api/now/table/sc_req_item/<sysapproval_value>
  ?sysparm_fields=sys_id,number,short_description,description,cat_item,requested_for,price,recurring_price,quantity
  &sysparm_display_value=true
```

### Step 3: Extract Business Justification

Pull justification from multiple sources: request variables, description fields, and journal entries.

**From Catalog Variables:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_item_option_mtom
  query: request_item=<ritm_sys_id>
  fields: sc_item_option.item_option_new.question_text,sc_item_option.value
  limit: 50
```

**From Journal/Comments:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<source_sys_id>^element=comments^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

### Step 4: Calculate Cost Impact

Aggregate costs from the request including one-time and recurring charges.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: request=<request_sys_id>
  fields: sys_id,number,cat_item,price,recurring_price,quantity
  limit: 50
```

For detailed pricing:
```
Tool: SN-Query-Table
Parameters:
  table_name: fx_price
  query: id=<cat_item_sys_id>^active=true
  fields: sys_id,amount,currency,type,recurring_frequency,duration
  limit: 5
```

Calculate totals:
- **One-time cost**: SUM(price * quantity) across all line items
- **Monthly recurring**: SUM(recurring_price * quantity)
- **Annual impact**: One-time + (Monthly recurring * 12)
- **Budget utilization**: Compare against department budget if available

### Step 5: Build Approval History

Retrieve the full approval chain including completed and pending approvals.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: sysapproval=<source_sys_id>^ORDERBYsys_created_on
  fields: sys_id,approver,state,sys_created_on,sys_updated_on,comments,group,expected_start,due_date
  limit: 20
```

**REST Approach:**
```
GET /api/now/table/sysapproval_approver
  ?sysparm_query=sysapproval=<source_sys_id>^ORDERBYsys_created_on
  &sysparm_fields=sys_id,approver,state,sys_created_on,sys_updated_on,comments,group
  &sysparm_display_value=true
  &sysparm_limit=20
```

### Step 6: Retrieve Requester Profile Context

Get the requester's HR profile and department information for context.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=<opened_by_sys_id>
  fields: sys_id,user,department,location,job_title,manager,cost_center,employment_type,hire_date
  limit: 1
```

### Step 7: Check for Prior Similar Requests

Identify if the requester or department has submitted similar requests recently.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: requested_for=<requester_sys_id>^cat_item=<cat_item_sys_id>^sys_created_on>javascript:gs.daysAgo(365)
  fields: number,stage,price,sys_created_on,closed_at
  limit: 10
```

### Step 8: Assess Policy Compliance

Check if the request falls within policy thresholds:

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_rule
  query: table=sc_req_item^active=true
  fields: sys_id,name,description,condition,approval_type,order
  limit: 10
```

### Step 9: Compile the Approval Summary

Assemble all gathered information into a decision-ready format:

```
=== APPROVAL SUMMARY ===
Request: RITM0012345 - New Laptop Request
Submitted: 2025-12-01 14:30 by Jane Smith (Engineering)
Status: Awaiting Your Approval

--- Requester Profile ---
Name: Jane Smith
Title: Senior Software Engineer
Department: Engineering - Platform Team
Location: San Francisco, CA
Manager: Bob Johnson
Tenure: 3 years, 8 months

--- Business Justification ---
"Current laptop (2019 MacBook Pro) is experiencing frequent kernel panics
and battery failure. Unable to run local development environment with
current 8GB RAM. Requesting 16GB MacBook Pro for development workloads.
IT has confirmed current device is past end-of-life."

--- Cost Impact ---
One-Time Cost: $2,499.00
Monthly Recurring: $0.00
Annual Total Impact: $2,499.00
Department Budget Remaining: $45,200 (Q4)
Cost as % of Budget: 5.5%

--- Approval History ---
1. [APPROVED] 2025-12-01 15:00 - Direct Manager (Bob Johnson)
   Comment: "Confirmed hardware issues. Approved."
2. [PENDING]  2025-12-02 -- Director Approval (You)
3. [WAITING]  -- Finance Review (auto-triggered if > $2,000)

--- Risk Indicators ---
- Prior similar request: None in last 12 months
- Cost threshold: Exceeds $2,000 director approval threshold
- Policy compliance: Within hardware refresh policy (device > 3 years)
- Budget impact: Low (5.5% of remaining Q4 budget)

--- Recommendation Context ---
Similar requests in Engineering this quarter: 4 approved, 0 rejected
Average approval time: 1.2 business days
```

### Step 10: Record the Summary

Optionally attach the summary as a work note on the approval or source record.

**MCP Approach:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sysapproval_approver
  sys_id: <approval_sys_id>
  work_notes: "[AI-Generated Approval Summary]\n<compiled summary>"
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| SN-Query-Table | Fetch approvals, requests, profiles, history | Primary data gathering |
| SN-Get-Record | Retrieve single source record details | Detailed record inspection |
| SN-NL-Search | Find related requests or cases by description | Pattern matching for similar items |
| SN-Add-Work-Notes | Attach summary to approval record | Documentation and audit trail |

## Best Practices

1. **Lead with the decision-critical information** -- cost, justification, and risk at the top
2. **Include approval chain context** -- show what others have already decided
3. **Flag exceptions clearly** -- highlight policy violations or unusual patterns
4. **Show budget impact as percentage** -- raw numbers lack context without budget reference
5. **Include requester tenure** -- new hire requests may have different approval considerations
6. **Check for duplicate requests** -- surface recent similar requests to prevent waste
7. **Respect data sensitivity** -- omit salary, medical, or disciplinary details from summaries
8. **Use display values** -- always show names and labels rather than sys_ids
9. **Include timeline urgency** -- note SLA deadlines for time-sensitive approvals
10. **Provide historical benchmarks** -- show how similar requests were handled

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No approval records found | User has no pending approvals or wrong user sys_id | Verify approver sys_id matches the logged-in user |
| Variables not returned | MTOM query format incorrect | Use `sc_item_option_mtom` with proper dot-walking |
| Cost data missing | Catalog item has no price configured | Check `sc_cat_item.price` and `fx_price` table |
| Approval history incomplete | Some approvals use group instead of individual | Include `group` field and resolve group members |
| Journal entries empty | Comments stored in different element | Check both `comments` and `work_notes` elements |
| Profile not found | User lacks HR profile record | Fall back to `sys_user` table for basic information |

## Examples

### Example 1: HR Case Approval Summary

**Input:** "Summarize HR case HRC0010042 for the approver"

**Steps:** Retrieve case from `sn_hr_core_case`, pull employee profile, check approval chain, extract justification from case description and comments, calculate any cost impact from associated catalog items, compile summary.

### Example 2: High-Value Request Approval

**Input:** "Generate an approval summary for RITM0025001 which is a $15,000 server request"

**Steps:** Retrieve RITM details, extract all catalog variables including configuration specs, pull pricing details, build full approval chain (may include multiple levels for high-value items), check against procurement policies, flag budget impact, include vendor quotes if attached.

### Example 3: Batch Approval Summary for Manager

**Input:** "Show me all pending approvals with summaries for manager Bob Johnson"

**Steps:** Query all `sysapproval_approver` records where approver is Bob Johnson and state is requested, for each retrieve source record summary, aggregate total cost impact across all pending items, present as a prioritized list sorted by due date.

## Related Skills

- `hrsd/case-summarization` - General HR case summarization
- `catalog/approval-workflows` - Approval workflow configuration
- `catalog/request-fulfillment` - Fulfillment process details
- `reporting/sla-analysis` - SLA status and breach analysis
- `itsm/change-management` - Change request approval patterns
