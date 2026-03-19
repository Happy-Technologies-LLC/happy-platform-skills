---
name: procurement-summarization
version: 1.0.0
description: Summarize procurement cases including vendor communications, approval status, spend analysis, pipeline reports, and bottleneck identification
author: Happy Technologies LLC
tags: [procurement, summarization, spend-analysis, pipeline, procurement-case, reporting]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_proc_case
    - /api/now/table/proc_po
    - /api/now/table/proc_po_item
    - /api/now/table/sc_req_item
    - /api/now/table/core_company
    - /api/now/table/sn_spo_requisition
    - /api/now/table/sn_proc_invoice
    - /api/now/table/sys_journal_field
    - /api/now/table/sysapproval_approver
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Procurement Summarization

## Overview

This skill provides a structured approach to summarizing procurement operations in ServiceNow Sourcing and Procurement Operations. It helps you:

- Retrieve and consolidate procurement case details from `sn_proc_case`
- Summarize vendor communications, approval chains, and case progress
- Analyze spend across vendors, categories, and time periods using `proc_po` and `sn_proc_invoice`
- Generate pipeline reports showing requisitions, POs, and invoices at each stage
- Identify bottlenecks in approval workflows, vendor responses, and fulfillment

**When to use:** When procurement managers need an overview of case workload, spend trends, pipeline health, or when preparing executive reports on procurement operations.

## Prerequisites

- **Roles:** `sn_procurement.manager`, `sn_procurement.analyst`, or `procurement_admin`
- **Plugins:** `com.sn_procurement` (Sourcing and Procurement Operations) activated
- **Access:** Read access to `sn_proc_case`, `proc_po`, `proc_po_item`, `sn_spo_requisition`, `sn_proc_invoice`, `core_company`
- **Knowledge:** Familiarity with your organization's procurement workflow stages and approval hierarchies

## Procedure

### Step 1: Retrieve Procurement Cases

Query active procurement cases to understand current workload and status distribution.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_case
  query: active=true^ORDERBYDESCsys_updated_on
  fields: sys_id,number,short_description,state,priority,category,vendor,assigned_to,assignment_group,opened_at,sys_updated_on,approval,requested_by
  limit: 50
```

To filter by date range or category:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_case
  query: opened_at>=javascript:gs.beginningOfLast30Days()^category=contract_request
  fields: sys_id,number,short_description,state,priority,category,vendor,assigned_to,opened_at
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_proc_case?sysparm_query=active=true^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,number,short_description,state,priority,category,vendor,assigned_to,assignment_group,opened_at,sys_updated_on,approval,requested_by&sysparm_limit=50&sysparm_display_value=true
```

### Step 2: Gather Case Communications and Work Notes

Pull journal entries to summarize vendor interactions and internal notes.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by&sysparm_limit=30
```

### Step 3: Check Approval Status

Query approval records to identify pending approvals and bottlenecks.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: document_id=[case_sys_id]^ORDERBYDESCsys_updated_on
  fields: sys_id,approver,state,sys_updated_on,comments,source_table,group
  limit: 20
```

For a pipeline-wide view of pending approvals:
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: state=requested^source_table=sn_proc_case^ORDERBYsys_created_on
  fields: sys_id,approver,document_id,state,sys_created_on,group
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sysapproval_approver?sysparm_query=document_id=[case_sys_id]^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,approver,state,sys_updated_on,comments,source_table,group&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Analyze Spend by Vendor and Category

Query purchase orders to build a spend summary.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: ordered_date>=javascript:gs.beginningOfLast90Days()^state!=cancelled
  fields: sys_id,number,vendor,total_cost,state,ordered_date,currency,category
  limit: 200
```

Aggregate by vendor:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: ordered_date>=javascript:gs.beginningOfLastQuarter()^state!=cancelled^vendor=[vendor_sys_id]
  fields: sys_id,number,total_cost,state,ordered_date
  limit: 100
```

**Using REST API:**
```bash
# All POs from last 90 days
GET /api/now/table/proc_po?sysparm_query=ordered_date>=javascript:gs.beginningOfLast90Days()^state!=cancelled&sysparm_fields=sys_id,number,vendor,total_cost,state,ordered_date,currency,category&sysparm_limit=200&sysparm_display_value=true

# Spend for a specific vendor
GET /api/now/table/proc_po?sysparm_query=vendor=[vendor_sys_id]^ordered_date>=javascript:gs.beginningOfLastQuarter()^state!=cancelled&sysparm_fields=number,total_cost,state,ordered_date&sysparm_limit=100&sysparm_display_value=true
```

### Step 5: Generate Pipeline Report

Query across requisitions, POs, and invoices to show the procurement pipeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_spo_requisition
  query: state!=cancelled^sys_created_on>=javascript:gs.beginningOfLast30Days()
  fields: sys_id,number,state,requested_by,total_estimated_cost,sys_created_on,approval
  limit: 50
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_invoice
  query: state!=cancelled^sys_created_on>=javascript:gs.beginningOfLast30Days()
  fields: sys_id,number,state,vendor,invoice_amount,due_date,po_number
  limit: 50
```

**Using REST API:**
```bash
# Requisitions in pipeline
GET /api/now/table/sn_spo_requisition?sysparm_query=state!=cancelled^sys_created_on>=javascript:gs.beginningOfLast30Days()&sysparm_fields=sys_id,number,state,requested_by,total_estimated_cost,sys_created_on,approval&sysparm_limit=50&sysparm_display_value=true

# Invoices in pipeline
GET /api/now/table/sn_proc_invoice?sysparm_query=state!=cancelled^sys_created_on>=javascript:gs.beginningOfLast30Days()&sysparm_fields=sys_id,number,state,vendor,invoice_amount,due_date,po_number&sysparm_limit=50&sysparm_display_value=true
```

### Step 6: Build the Procurement Summary

Assemble the data into a structured report:

```
=== PROCUREMENT OPERATIONS SUMMARY ===
Period: [start_date] to [end_date]

CASE WORKLOAD:
Total Active Cases: [count]
By State: New [n] | In Progress [n] | Pending Approval [n] | Resolved [n]
By Priority: P1 [n] | P2 [n] | P3 [n] | P4 [n]
Avg Case Age: [days] days

APPROVAL BOTTLENECKS:
Pending Approvals: [count]
Oldest Pending: [case_number] - waiting [days] days for [approver_name]
Top Delayed Approvers:
  1. [approver] - [count] pending, avg [days] days
  2. [approver] - [count] pending, avg [days] days

PIPELINE STATUS:
Requisitions: [count] open ($[total_value])
Purchase Orders: [count] open ($[total_value])
Invoices: [count] pending ($[total_value])

SPEND ANALYSIS (Last 90 Days):
Total PO Spend: $[amount]
Top Vendors:
  1. [vendor_name] - $[amount] ([count] POs)
  2. [vendor_name] - $[amount] ([count] POs)
  3. [vendor_name] - $[amount] ([count] POs)

KEY OBSERVATIONS:
- [bottleneck or risk identified]
- [trend noted]
- [action recommended]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query cases, POs, requisitions, invoices, and approvals |
| `SN-NL-Search` | Natural language searches (e.g., "show all procurement cases from last week") |
| `SN-Read-Record` | Retrieve a single case or PO record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_proc_case` | GET | Query procurement cases |
| `/api/now/table/proc_po` | GET | Retrieve purchase orders for spend analysis |
| `/api/now/table/sn_spo_requisition` | GET | Query requisitions in pipeline |
| `/api/now/table/sn_proc_invoice` | GET | Query invoices for payment tracking |
| `/api/now/table/sysapproval_approver` | GET | Check approval statuses |
| `/api/now/table/sys_journal_field` | GET | Retrieve case work notes and comments |
| `/api/now/table/core_company` | GET | Vendor details |

## Best Practices

- **Use Display Values:** Always include `sysparm_display_value=true` in REST calls for readable vendor and user names
- **Scope Time Ranges:** Always bound queries with date ranges to avoid pulling excessive data
- **Group by State:** Summarize cases and POs by state to quickly identify where work is stuck
- **Track Aging:** Flag any case or approval older than your SLA threshold (e.g., 5 business days)
- **Normalize Currency:** When aggregating spend across vendors, ensure all amounts use the same currency
- **Refresh Regularly:** Procurement pipelines change rapidly; regenerate summaries at consistent intervals

## Troubleshooting

### "No procurement cases found"

**Cause:** The `sn_proc_case` table may not be populated if your organization uses a custom case table
**Solution:** Check with your admin for the correct table name; some orgs extend `task` directly for procurement cases

### "Spend totals seem incorrect"

**Cause:** Cancelled or duplicate POs may be included, or currency conversion is needed
**Solution:** Ensure the query excludes `state=cancelled`; check the `currency` field and convert to a base currency before summing

### "Approval records missing"

**Cause:** Approvals may be handled via workflow rather than the `sysapproval_approver` table
**Solution:** Check `wf_context` and `wf_executing` tables for workflow-based approvals tied to the case

### "Requisition data not available"

**Cause:** The `com.sn_sourcing` plugin may not be activated
**Solution:** Verify plugin activation; requisition data requires `com.sn_sourcing` or `com.sn_procurement`

## Examples

### Example 1: Weekly Procurement Dashboard

**Scenario:** Procurement manager needs a weekly status summary.

**Steps:**
1. Query all active cases: 42 active, 8 pending approval
2. Query POs from last 7 days: 15 new POs totaling $234,500
3. Check pending approvals: 3 approvals waiting 5+ days
4. Query invoices: 12 invoices pending match, $89,200 total

**Output:**
```
WEEKLY PROCUREMENT SUMMARY (Mar 12-19, 2026)

CASES: 42 active (8 new this week)
  Pending Approval: 8 | In Progress: 22 | Awaiting Vendor: 12

BOTTLENECK ALERT:
  3 approvals stalled 5+ days - Finance VP approval queue

PIPELINE:
  Requisitions: 18 open ($412,000 estimated)
  Purchase Orders: 15 new this week ($234,500)
  Invoices: 12 pending match ($89,200)

SPEND THIS WEEK: $234,500 across 6 vendors
  Top: TechSupply Inc - $98,000 (3 POs)
```

### Example 2: Vendor Communication Summary

**Scenario:** Analyst needs to summarize all communications for a vendor dispute case.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_case
  query: number=PROC0005678
  fields: sys_id,number,short_description,state,vendor,category,opened_at,assigned_to
  limit: 1
```

Then retrieve work notes and comments:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on
  fields: element,value,sys_created_on,sys_created_by
  limit: 50
```

**Output:**
```
CASE PROC0005678 - VENDOR COMMUNICATION SUMMARY
Vendor: Global Parts Ltd | Category: Price Dispute | State: In Progress

TIMELINE:
Mar 18 - [Analyst] Vendor agreed to credit $2,400 for overcharge
Mar 16 - [Vendor] Responded: pricing error on catalog item SKU-4421
Mar 14 - [Analyst] Sent formal dispute letter with PO and invoice evidence
Mar 12 - [System] Case created from invoice exception INVCASE0001234

RESOLUTION PATH: Credit memo expected by Mar 25
```

## Related Skills

- `procurement/invoice-management` - Invoice matching and exception handling
- `procurement/purchase-order-summarization` - Detailed PO status and delivery tracking
- `procurement/sourcing-summarization` - Sourcing event and bid analysis
- `procurement/supplier-recommendation` - Vendor performance evaluation
- `reporting/executive-dashboard` - Build executive-level dashboards
