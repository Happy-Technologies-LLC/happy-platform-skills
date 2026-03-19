---
name: purchase-order-summarization
version: 1.0.0
description: Summarize purchase orders with line items, delivery status, receipt tracking, budget impact analysis, and late delivery risk identification
author: Happy Technologies LLC
tags: [procurement, purchase-order, summarization, delivery-tracking, budget, receipt]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/proc_po
    - /api/now/table/proc_po_item
    - /api/now/table/proc_rec_slip_item
    - /api/now/table/core_company
    - /api/now/table/sc_req_item
    - /api/now/table/sn_spo_requisition
    - /api/now/table/sn_proc_invoice
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Purchase Order Summarization

## Overview

This skill provides a structured approach to summarizing purchase orders in ServiceNow Sourcing and Procurement Operations. It helps you:

- Retrieve complete PO details including all line items from `proc_po` and `proc_po_item`
- Track delivery status and receipt progress via `proc_rec_slip_item`
- Assess budget impact by comparing PO spend against planned budgets
- Identify orders at risk of late delivery based on expected delivery dates and receipt gaps
- Link POs back to originating requisitions and requested items

**When to use:** When procurement staff need a consolidated view of PO status, when tracking deliveries against commitments, or when assessing budget consumption and delivery risk.

## Prerequisites

- **Roles:** `sn_procurement.manager`, `sn_procurement.analyst`, or `procurement_user`
- **Plugins:** `com.sn_procurement` (Sourcing and Procurement Operations) activated
- **Access:** Read access to `proc_po`, `proc_po_item`, `proc_rec_slip_item`, `core_company`, `sc_req_item`
- **Knowledge:** Understanding of your organization's PO lifecycle states and delivery SLAs

## Procedure

### Step 1: Retrieve the Purchase Order Header

Fetch core PO details including vendor, amounts, and dates.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: proc_po
  sys_id: [po_sys_id]
  fields: sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency,ship_to,bill_to,requested_by,purchase_order_type,payment_terms,contract,description,short_description
```

If searching by PO number:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: number=PO0012345
  fields: sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency,ship_to,bill_to,requested_by,purchase_order_type,payment_terms,contract
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/proc_po?sysparm_query=number=PO0012345&sysparm_fields=sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency,ship_to,bill_to,requested_by,purchase_order_type,payment_terms,contract&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Line Items

Fetch all line items on the purchase order.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po_item
  query: purchase_order=[po_sys_id]^ORDERBYline_number
  fields: sys_id,line_number,item_description,model,part_number,quantity,unit_price,total_cost,received_quantity,state,expected_delivery,cat_item,requested_item
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/proc_po_item?sysparm_query=purchase_order=[po_sys_id]^ORDERBYline_number&sysparm_fields=sys_id,line_number,item_description,model,part_number,quantity,unit_price,total_cost,received_quantity,state,expected_delivery,cat_item,requested_item&sysparm_limit=100&sysparm_display_value=true
```

### Step 3: Check Goods Receipt Status

Query receiving slip items to determine what has been delivered.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_rec_slip_item
  query: purchase_order=[po_sys_id]^ORDERBYreceived_date
  fields: sys_id,po_item,quantity_received,received_date,receiving_slip,condition,notes,accepted_quantity,rejected_quantity
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/proc_rec_slip_item?sysparm_query=purchase_order=[po_sys_id]^ORDERBYreceived_date&sysparm_fields=sys_id,po_item,quantity_received,received_date,receiving_slip,condition,notes,accepted_quantity,rejected_quantity&sysparm_limit=100&sysparm_display_value=true
```

### Step 4: Retrieve Vendor Details

Get supplier information for context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: sys_id=[vendor_sys_id]
  fields: sys_id,name,stock_symbol,vendor_type,city,state,country,phone,contact,vendor_rating
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/core_company/[vendor_sys_id]?sysparm_fields=sys_id,name,vendor_type,city,state,country,phone,contact,vendor_rating&sysparm_display_value=true
```

### Step 5: Identify Late Delivery Risks

Query POs where expected delivery has passed but items remain unreceived.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: expected_delivery<javascript:gs.nowDateTime()^state=ordered^ORstate=partially_received
  fields: sys_id,number,vendor,total_cost,expected_delivery,ordered_date,state
  limit: 50
  order_by: expected_delivery
```

For line-level risk assessment:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po_item
  query: expected_delivery<javascript:gs.nowDateTime()^received_quantity<quantity^stateNOT INcancelled,received
  fields: sys_id,purchase_order,item_description,quantity,received_quantity,expected_delivery,state
  limit: 50
  order_by: expected_delivery
```

**Using REST API:**
```bash
# POs past expected delivery
GET /api/now/table/proc_po?sysparm_query=expected_delivery<javascript:gs.nowDateTime()^state=ordered^ORstate=partially_received&sysparm_fields=sys_id,number,vendor,total_cost,expected_delivery,ordered_date,state&sysparm_limit=50&sysparm_display_value=true

# Line items past expected delivery with outstanding quantities
GET /api/now/table/proc_po_item?sysparm_query=expected_delivery<javascript:gs.nowDateTime()^received_quantityLESSTHANquantity^stateNOT INcancelled,received&sysparm_fields=sys_id,purchase_order,item_description,quantity,received_quantity,expected_delivery,state&sysparm_limit=50&sysparm_display_value=true
```

### Step 6: Link to Originating Requests

Trace PO line items back to requested items and requisitions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: sys_id=[requested_item_sys_id]
  fields: sys_id,number,short_description,request,requested_for,state,stage,price,quantity
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sc_req_item/[requested_item_sys_id]?sysparm_fields=sys_id,number,short_description,request,requested_for,state,stage,price,quantity&sysparm_display_value=true
```

### Step 7: Build the PO Summary

Assemble the collected data:

```
=== PURCHASE ORDER SUMMARY ===
PO Number: PO0012345
State: [state] | Type: [purchase_order_type]
Vendor: [vendor_name] ([city], [country])
Ordered: [ordered_date] | Expected Delivery: [expected_delivery]
Total Cost: [currency] [total_cost]

LINE ITEMS: [count] items
| # | Description | Qty | Unit Price | Total | Received | Status |
|---|------------|-----|-----------|-------|----------|--------|
| 1 | [desc]     | 100 | $10.00    | $1,000| 100      | Received |
| 2 | [desc]     |  50 | $25.00    | $1,250|  30      | Partial  |
| 3 | [desc]     |  25 | $50.00    | $1,250|   0      | Ordered  |

RECEIPT STATUS:
Total Items: [total_qty] | Received: [received_qty] ([pct]%)
Fully Received Lines: [count] of [total_lines]
Last Receipt Date: [date]

DELIVERY RISK:
- Line 2: 20 units outstanding, [days] days past expected delivery
- Line 3: 25 units not yet shipped, delivery due in [days] days

BUDGET IMPACT:
Requisition: REQ0009876 | Requested By: [name]
Original Estimate: $[est] | PO Total: $[actual] | Variance: $[diff] ([pct]%)

RELATED INVOICES:
- INV-2024-0456: $[amount] - [state]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query POs, line items, receipts, vendors, and requisitions |
| `SN-NL-Search` | Natural language search (e.g., "find overdue purchase orders for Dell") |
| `SN-Read-Record` | Retrieve a single PO record with all fields |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/proc_po` | GET | Query purchase orders |
| `/api/now/table/proc_po_item` | GET | Retrieve PO line items |
| `/api/now/table/proc_rec_slip_item` | GET | Check goods receipt status |
| `/api/now/table/core_company` | GET | Vendor details |
| `/api/now/table/sc_req_item` | GET | Originating requested items |
| `/api/now/table/sn_spo_requisition` | GET | Requisition details |
| `/api/now/table/sn_proc_invoice` | GET | Related invoices |

## Best Practices

- **Track Partial Receipts:** Always compare `received_quantity` against `quantity` at the line item level, not just PO totals
- **Flag Overdue Items Early:** Set up risk thresholds (e.g., 3 days before expected delivery with no receipt)
- **Include Vendor Context:** Vendor rating and history provide important context for risk assessment
- **Compare to Budget:** Always link PO spend back to the originating requisition to track budget variance
- **Use Display Values:** Include `sysparm_display_value=true` to get readable vendor names and states
- **Check for Amendments:** Look for PO revision history or related POs that may indicate change orders

## Troubleshooting

### "PO line items not found"

**Cause:** The PO may have been created without line items or items are on a related table
**Solution:** Verify the `purchase_order` reference field on `proc_po_item` matches the PO sys_id; check if items use a custom line item table

### "Received quantity exceeds ordered quantity"

**Cause:** Over-shipment by vendor or duplicate receiving slip entries
**Solution:** Query `proc_rec_slip_item` by `po_item` to check for duplicates; verify with warehouse receiving team

### "Expected delivery date is empty"

**Cause:** The field was not populated when the PO was created
**Solution:** Check individual line item `expected_delivery` fields which may be set independently; contact the vendor for updated delivery estimates

### "Cannot link PO to requisition"

**Cause:** The PO may have been created directly without a requisition
**Solution:** Check the `requested_item` field on PO line items; alternatively search `sn_spo_requisition` by vendor and date range

## Examples

### Example 1: Single PO Summary

**Scenario:** Summarize PO0023456 for a status meeting.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: number=PO0023456
  fields: sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po_item
  query: purchase_order.number=PO0023456
  fields: line_number,item_description,quantity,unit_price,total_cost,received_quantity,state
  limit: 50
```

**Output:**
```
PO0023456 - SUMMARY
Vendor: TechSupply Inc | State: Partially Received
Ordered: Feb 28, 2026 | Expected: Mar 15, 2026 (4 DAYS OVERDUE)
Total: $47,500.00

LINE ITEMS:
1. Laptop Dell Latitude 5540 x20 @ $1,200 = $24,000 - RECEIVED (20/20)
2. Docking Station WD22TB4 x20 @ $350 = $7,000 - RECEIVED (20/20)
3. Monitor Dell U2723QE x40 @ $412.50 = $16,500 - PARTIAL (25/40)

RISK: Line 3 has 15 monitors outstanding, 4 days past expected delivery.
ACTION: Contact TechSupply for updated ETA on remaining monitors.
```

### Example 2: Late Delivery Risk Report

**Scenario:** Generate a report of all POs at risk of late delivery.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: expected_delivery<javascript:gs.nowDateTime()^stateINordered,partially_received^ORDERBYexpected_delivery
  fields: number,vendor,total_cost,expected_delivery,state
  limit: 25
```

**Output:**
```
LATE DELIVERY RISK REPORT - Mar 19, 2026

OVERDUE (past expected delivery):
1. PO0023456 - TechSupply Inc - $16,500 remaining - 4 days overdue
2. PO0023401 - Office Depot - $3,200 remaining - 7 days overdue
3. PO0023389 - Cisco Systems - $142,000 remaining - 12 days overdue

AT RISK (delivery within 3 days, no receipt activity):
4. PO0023501 - AWS Corp - $28,000 - due Mar 21
5. PO0023498 - Grainger - $5,600 - due Mar 22

TOTAL AT RISK: $195,300 across 5 POs
RECOMMENDED: Escalate PO0023389 (Cisco) - 12 days overdue, high value.
```

### Example 3: Budget Impact Analysis

**Scenario:** Compare PO actuals against requisition estimates for Q1.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: ordered_date>=2026-01-01^ordered_date<2026-04-01^state!=cancelled
  fields: number,vendor,total_cost,ordered_date,state
  limit: 200
```

**Output:**
```
Q1 2026 BUDGET IMPACT
Total POs Issued: 67
Total Committed: $1,245,600
Total Received/Invoiced: $892,300
Outstanding Commitments: $353,300

BY CATEGORY:
  IT Hardware: $456,000 (37% of total)
  Software Licenses: $312,000 (25%)
  Office Supplies: $98,600 (8%)
  Professional Services: $379,000 (30%)

VARIANCE FROM BUDGET:
  Allocated: $1,400,000
  Committed: $1,245,600
  Remaining: $154,400 (11% under budget)
```

## Related Skills

- `procurement/invoice-management` - Three-way matching and invoice processing
- `procurement/procurement-summarization` - Procurement case and pipeline overview
- `procurement/sourcing-summarization` - Sourcing events and bid analysis
- `procurement/supplier-recommendation` - Vendor performance and scoring
- `catalog/request-fulfillment` - Track fulfillment of catalog requests
