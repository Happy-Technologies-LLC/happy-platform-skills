---
name: invoice-management
version: 1.0.0
description: Manage accounts payable invoices including data extraction, PO matching, three-way matching (PO, receipt, invoice), discrepancy identification, and resolution routing
author: Happy Technologies LLC
tags: [procurement, invoice, accounts-payable, three-way-match, po-matching, finance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Create-Record
  rest:
    - /api/now/table/sn_proc_invoice
    - /api/now/table/proc_po
    - /api/now/table/proc_po_item
    - /api/now/table/proc_rec_slip_item
    - /api/now/table/sn_apo_invoice_case
    - /api/now/table/core_company
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Invoice Management

## Overview

This skill provides a structured approach to managing accounts payable invoices in ServiceNow Sourcing and Procurement Operations. It helps you:

- Extract and validate invoice data from the `sn_proc_invoice` table
- Match invoices to purchase orders using three-way matching (PO, receipt, invoice)
- Identify discrepancies between invoiced amounts, PO amounts, and received quantities
- Create and route invoice exception cases via `sn_apo_invoice_case`
- Track invoice approval workflows and payment readiness

**When to use:** When invoices need to be reviewed, matched against purchase orders and goods receipts, or when discrepancies require investigation and resolution.

## Prerequisites

- **Roles:** `sn_procurement.invoice_manager`, `sn_procurement.analyst`, or `accounts_payable`
- **Plugins:** `com.sn_procurement` (Sourcing and Procurement Operations) activated
- **Access:** Read/write access to `sn_proc_invoice`, `proc_po`, `proc_po_item`, `proc_rec_slip_item`
- **Knowledge:** Understanding of three-way matching principles and your organization's tolerance thresholds

## Procedure

### Step 1: Query Pending Invoices

Retrieve invoices awaiting processing or matching.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_invoice
  query: state=pending^ORstate=awaiting_match
  fields: sys_id,number,vendor,po_number,invoice_amount,invoice_date,currency,state,due_date
  limit: 25
  order_by: due_date
```

**Using REST API:**
```bash
GET /api/now/table/sn_proc_invoice?sysparm_query=state=pending^ORstate=awaiting_match^ORDERBYdue_date&sysparm_fields=sys_id,number,vendor,po_number,invoice_amount,invoice_date,currency,state,due_date&sysparm_limit=25
```

### Step 2: Retrieve the Linked Purchase Order

For each invoice, fetch the associated PO and its line items to begin matching.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: number=[PO_NUMBER]
  fields: sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency
  limit: 1
```

Then fetch PO line items:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po_item
  query: purchase_order.number=[PO_NUMBER]
  fields: sys_id,item_description,quantity,unit_price,total_cost,received_quantity,model,part_number
  limit: 50
```

**Using REST API:**
```bash
# Get PO header
GET /api/now/table/proc_po?sysparm_query=number=[PO_NUMBER]&sysparm_fields=sys_id,number,vendor,total_cost,state,ordered_date,expected_delivery,currency&sysparm_limit=1

# Get PO line items
GET /api/now/table/proc_po_item?sysparm_query=purchase_order.number=[PO_NUMBER]&sysparm_fields=sys_id,item_description,quantity,unit_price,total_cost,received_quantity,model,part_number&sysparm_limit=50
```

### Step 3: Retrieve Goods Receipt Records

Query receiving slip items to verify what was physically received.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_rec_slip_item
  query: purchase_order.number=[PO_NUMBER]
  fields: sys_id,quantity_received,received_date,po_item,receiving_slip,condition,notes
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/proc_rec_slip_item?sysparm_query=purchase_order.number=[PO_NUMBER]&sysparm_fields=sys_id,quantity_received,received_date,po_item,receiving_slip,condition,notes&sysparm_limit=50
```

### Step 4: Perform Three-Way Matching

Compare across the three documents. For each line item, validate:

1. **Quantity Match:** Invoice quantity <= Received quantity <= Ordered quantity
2. **Price Match:** Invoice unit price == PO unit price (within tolerance, typically 1-5%)
3. **Total Match:** Invoice total <= PO total (within tolerance)

| Check | Formula | Pass Condition |
|-------|---------|----------------|
| Quantity | `invoice_qty <= received_qty` | Invoice does not exceed receipt |
| Unit Price | `abs(invoice_price - po_price) / po_price * 100` | Variance within threshold (e.g., 2%) |
| Line Total | `invoice_line_total <= po_line_total * (1 + tolerance)` | Within tolerance band |
| Invoice Total | `invoice_total <= po_total * (1 + tolerance)` | Grand total within tolerance |

### Step 5: Flag and Route Discrepancies

If matching fails, create an invoice exception case for resolution.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_apo_invoice_case
  fields:
    invoice: [invoice_sys_id]
    purchase_order: [po_sys_id]
    short_description: "Three-way match failure: quantity discrepancy on PO0012345"
    description: "Invoice INV-9876 line 2: invoiced qty 100, received qty 85. Variance: 15 units (17.6%). Exceeds 5% tolerance threshold."
    priority: 2
    category: quantity_discrepancy
    state: new
    assigned_to: [procurement_analyst_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/sn_apo_invoice_case
Content-Type: application/json

{
  "invoice": "[invoice_sys_id]",
  "purchase_order": "[po_sys_id]",
  "short_description": "Three-way match failure: quantity discrepancy on PO0012345",
  "description": "Invoice INV-9876 line 2: invoiced qty 100, received qty 85. Variance: 15 units (17.6%).",
  "priority": "2",
  "category": "quantity_discrepancy",
  "state": "new"
}
```

### Step 6: Update Invoice State

Mark the invoice as matched or exception based on results.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_proc_invoice
  sys_id: [invoice_sys_id]
  fields:
    state: matched
    match_status: passed
    work_notes: "Three-way match completed. All line items within tolerance. Ready for payment approval."
```

For failed matches:
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_proc_invoice
  sys_id: [invoice_sys_id]
  fields:
    state: exception
    match_status: failed
    work_notes: "Three-way match failed. Exception case CASE0045678 created for quantity discrepancy on lines 2, 5."
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_proc_invoice/[invoice_sys_id]
Content-Type: application/json

{
  "state": "exception",
  "match_status": "failed",
  "work_notes": "Three-way match failed. Exception case created."
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query invoices, POs, receipts, and vendors |
| `SN-NL-Search` | Natural language search for invoices by vendor or amount |
| `SN-Create-Record` | Create invoice exception cases |
| `SN-Update-Record` | Update invoice state and match status |
| `SN-Add-Work-Notes` | Document matching results and decisions |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_proc_invoice` | GET | Query invoices |
| `/api/now/table/sn_proc_invoice/{sys_id}` | PATCH | Update invoice status |
| `/api/now/table/proc_po` | GET | Retrieve purchase orders |
| `/api/now/table/proc_po_item` | GET | Retrieve PO line items |
| `/api/now/table/proc_rec_slip_item` | GET | Retrieve goods receipts |
| `/api/now/table/sn_apo_invoice_case` | POST | Create exception cases |

## Best Practices

- **Set Tolerance Thresholds:** Define acceptable variance percentages per category (e.g., 2% for IT hardware, 5% for office supplies)
- **Prioritize by Due Date:** Process invoices closest to payment due date first to avoid late fees
- **Verify Vendor Details:** Cross-reference `core_company` records to confirm vendor bank details before payment
- **Batch Processing:** Group invoices by vendor or PO for efficient matching workflows
- **Audit Trail:** Always add work notes documenting match results for compliance purposes
- **Partial Receipts:** Handle partial shipments by matching only received quantities and holding remainder

## Troubleshooting

### "Invoice has no linked purchase order"

**Cause:** The PO number field is empty or contains a non-matching reference
**Solution:** Search `proc_po` by vendor and date range to find the correct PO; update the invoice record

### "Goods receipt records not found"

**Cause:** Receiving has not been recorded in ServiceNow yet
**Solution:** Check `proc_rec_slip_item` by PO; contact warehouse to confirm physical receipt and create receiving slip

### "Invoice amount exceeds PO total"

**Cause:** Price increases, additional charges (shipping, tax), or duplicate invoicing
**Solution:** Create an exception case; verify with vendor if charges are legitimate; check for duplicate invoices using `sysparm_query=vendor=[vendor_id]^invoice_amount=[amount]^invoice_date>=[date]`

### "Multiple POs on a single invoice"

**Cause:** Vendor consolidated multiple orders into one invoice
**Solution:** Split the invoice or match line-by-line against individual POs using part numbers or item descriptions

## Examples

### Example 1: Successful Three-Way Match

**Scenario:** Invoice INV-2024-0456 from Acme Corp for $15,000.00

**Steps:**
1. Query invoice: amount $15,000, linked to PO0012345
2. PO0012345 total: $15,000, 3 line items
3. All 3 items fully received per `proc_rec_slip_item`
4. Price variance: 0% on all lines
5. Result: **Match passed**

```
Tool: SN-Update-Record
Parameters:
  table_name: sn_proc_invoice
  sys_id: a1b2c3d4...
  fields:
    state: matched
    match_status: passed
    work_notes: "Three-way match passed. PO0012345 fully received. All prices match. Ready for payment."
```

### Example 2: Discrepancy Requiring Resolution

**Scenario:** Invoice INV-2024-0789 shows 500 units at $12.00 each ($6,000). PO shows 500 units at $10.00 ($5,000). Receipt confirms 500 units.

**Analysis:**
- Quantity: Matched (500 = 500)
- Unit price: $12.00 vs $10.00 = 20% variance (exceeds 2% threshold)
- Total: $6,000 vs $5,000 = $1,000 overage

**Action:** Create exception case, flag for procurement analyst review, hold payment.

### Example 3: Partial Receipt Matching

**Scenario:** PO for 1,000 units, 750 received, invoice for 750 units.

**Analysis:**
- Invoice quantity (750) matches received quantity (750)
- Invoice does not exceed PO quantity (750 <= 1,000)
- Result: **Partial match passed** -- invoice can be approved for 750 units

## Related Skills

- `procurement/purchase-order-summarization` - Summarize PO details and delivery status
- `procurement/procurement-summarization` - Procurement case and pipeline overview
- `procurement/supplier-recommendation` - Evaluate vendor performance for sourcing decisions
- `catalog/approval-workflows` - Configure invoice approval workflows
