---
name: supplier-recommendation
version: 1.0.0
description: Recommend suppliers based on historical performance, pricing competitiveness, compliance status, category expertise, scorecard analysis, and risk factors
author: Happy Technologies LLC
tags: [procurement, supplier, vendor, recommendation, scorecard, risk, performance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/core_company
    - /api/now/table/proc_po
    - /api/now/table/proc_po_item
    - /api/now/table/proc_rec_slip_item
    - /api/now/table/ast_contract
    - /api/now/table/sn_proc_invoice
    - /api/now/table/sn_apo_invoice_case
    - /api/now/table/proc_sourcing_event
    - /api/now/table/proc_negotiation
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Supplier Recommendation

## Overview

This skill provides a structured approach to recommending suppliers in ServiceNow Sourcing and Procurement Operations. It helps you:

- Evaluate suppliers based on historical delivery performance, quality, and responsiveness
- Analyze pricing competitiveness using PO and negotiation data
- Assess compliance status including contract terms and regulatory requirements
- Score suppliers across weighted criteria using scorecard methodology
- Identify risk factors such as geographic concentration, financial instability, and capacity constraints
- Generate ranked recommendations for sourcing decisions

**When to use:** When procurement teams need to select vendors for new sourcing events, evaluate existing supplier relationships, or build an approved vendor shortlist for a category.

## Prerequisites

- **Roles:** `sn_procurement.sourcing_manager`, `sn_procurement.analyst`, or `vendor_manager`
- **Plugins:** `com.sn_procurement` (Sourcing and Procurement Operations) activated
- **Access:** Read access to `core_company`, `proc_po`, `proc_po_item`, `proc_rec_slip_item`, `ast_contract`, `sn_proc_invoice`
- **Knowledge:** Understanding of your organization's vendor evaluation criteria and category management strategy

## Procedure

### Step 1: Identify Candidate Suppliers

Query vendors by category, type, or keyword to build a candidate list.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: vendor=true^vendor_type=IT Hardware^ORDERBYname
  fields: sys_id,name,vendor_type,city,state,country,stock_symbol,vendor_rating,phone,contact,notes
  limit: 25
```

For broader search by name:
```
Tool: SN-NL-Search
Parameters:
  query: "IT hardware suppliers in the United States"
  table: core_company
```

**Using REST API:**
```bash
GET /api/now/table/core_company?sysparm_query=vendor=true^vendor_type=IT Hardware^ORDERBYname&sysparm_fields=sys_id,name,vendor_type,city,state,country,vendor_rating,phone,contact&sysparm_limit=25&sysparm_display_value=true
```

### Step 2: Analyze Historical Delivery Performance

For each candidate, evaluate PO fulfillment and on-time delivery rates.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: vendor=[vendor_sys_id]^ordered_date>=javascript:gs.beginningOfLast12Months()^state!=cancelled
  fields: sys_id,number,total_cost,state,ordered_date,expected_delivery,currency
  limit: 100
```

Check receipt timeliness:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_rec_slip_item
  query: purchase_order.vendor=[vendor_sys_id]^received_date>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,purchase_order,po_item,quantity_received,received_date,condition,accepted_quantity,rejected_quantity
  limit: 200
```

**Using REST API:**
```bash
# PO history
GET /api/now/table/proc_po?sysparm_query=vendor=[vendor_sys_id]^ordered_date>=javascript:gs.beginningOfLast12Months()^state!=cancelled&sysparm_fields=sys_id,number,total_cost,state,ordered_date,expected_delivery&sysparm_limit=100&sysparm_display_value=true

# Receipt history
GET /api/now/table/proc_rec_slip_item?sysparm_query=purchase_order.vendor=[vendor_sys_id]^received_date>=javascript:gs.beginningOfLast12Months()&sysparm_fields=purchase_order,quantity_received,received_date,condition,accepted_quantity,rejected_quantity&sysparm_limit=200&sysparm_display_value=true
```

### Step 3: Evaluate Pricing Competitiveness

Compare pricing across vendors using PO line items and negotiation data.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po_item
  query: purchase_order.vendor=[vendor_sys_id]^purchase_order.ordered_date>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,item_description,model,part_number,unit_price,quantity,total_cost
  limit: 100
```

Check sourcing event bid history:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_negotiation
  query: vendor=[vendor_sys_id]^submitted_date>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,sourcing_event,total_bid_amount,round,overall_score,award_recommendation,state
  limit: 20
```

**Using REST API:**
```bash
# Line item pricing
GET /api/now/table/proc_po_item?sysparm_query=purchase_order.vendor=[vendor_sys_id]^purchase_order.ordered_date>=javascript:gs.beginningOfLast12Months()&sysparm_fields=item_description,model,part_number,unit_price,quantity,total_cost&sysparm_limit=100&sysparm_display_value=true

# Bid history
GET /api/now/table/proc_negotiation?sysparm_query=vendor=[vendor_sys_id]^submitted_date>=javascript:gs.beginningOfLast12Months()&sysparm_fields=sourcing_event,total_bid_amount,round,overall_score,award_recommendation,state&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Review Compliance and Contract Status

Check active contracts and compliance standing.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: ast_contract
  query: vendor=[vendor_sys_id]^ORDERBYDESCends
  fields: sys_id,number,short_description,state,starts,ends,cost,contract_type,renewal,terms_and_conditions
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/ast_contract?sysparm_query=vendor=[vendor_sys_id]^ORDERBYDESCends&sysparm_fields=sys_id,number,short_description,state,starts,ends,cost,contract_type,renewal,terms_and_conditions&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Check Invoice and Payment History

Review invoice accuracy as a quality indicator.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_proc_invoice
  query: vendor=[vendor_sys_id]^sys_created_on>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,number,invoice_amount,state,match_status,po_number,due_date
  limit: 50
```

Check for invoice exception cases:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_apo_invoice_case
  query: invoice.vendor=[vendor_sys_id]^sys_created_on>=javascript:gs.beginningOfLast12Months()
  fields: sys_id,number,short_description,category,state,priority
  limit: 20
```

**Using REST API:**
```bash
# Invoice history
GET /api/now/table/sn_proc_invoice?sysparm_query=vendor=[vendor_sys_id]^sys_created_on>=javascript:gs.beginningOfLast12Months()&sysparm_fields=number,invoice_amount,state,match_status,po_number,due_date&sysparm_limit=50&sysparm_display_value=true

# Invoice exceptions
GET /api/now/table/sn_apo_invoice_case?sysparm_query=invoice.vendor=[vendor_sys_id]^sys_created_on>=javascript:gs.beginningOfLast12Months()&sysparm_fields=number,short_description,category,state,priority&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Build Supplier Scorecard

Calculate scores across weighted dimensions:

```
=== SUPPLIER SCORECARD ===

SCORING DIMENSIONS:
| Dimension             | Weight | Calculation Method |
|-----------------------|--------|--------------------|
| Delivery Performance  | 25%    | % of POs delivered on or before expected date |
| Quality               | 20%    | Acceptance rate from receiving slips |
| Pricing               | 20%    | Comparison to category average and bid competitiveness |
| Compliance            | 15%    | Active contracts, certifications, regulatory status |
| Invoice Accuracy      | 10%    | % of invoices passing three-way match |
| Responsiveness        | 10%    | Average negotiation turnaround, communication quality |

SCORING FORMULA:
  Total Score = Sum(dimension_score * weight) for all dimensions
  Each dimension scored 0-100
```

### Step 7: Generate Recommendation Report

Produce a ranked supplier recommendation:

```
=== SUPPLIER RECOMMENDATION ===
Category: IT Hardware | Date: Mar 19, 2026

RANKED SUPPLIERS:

1. TECHSUPPLY INC (Score: 88.5/100) ★ RECOMMENDED
   Delivery: 95% on-time (38/40 POs) .............. 95/100
   Quality: 99.2% acceptance rate .................. 99/100
   Pricing: 3% below category average .............. 82/100
   Compliance: All certs current, contract active ... 90/100
   Invoice Accuracy: 96% match rate ................ 96/100
   Responsiveness: 1.2 day avg response ............ 85/100
   12-Month Spend: $456,000 | Active Contract: Yes (expires Dec 2026)
   Risk: LOW

2. GLOBAL TECH SOLUTIONS (Score: 82.1/100)
   Delivery: 88% on-time (22/25 POs) .............. 88/100
   Quality: 97.5% acceptance rate .................. 97/100
   Pricing: 1% above category average .............. 72/100
   Compliance: ISO 27001 expiring Jun 2026 ......... 75/100
   Invoice Accuracy: 92% match rate ................ 92/100
   Responsiveness: 2.1 day avg response ............ 70/100
   12-Month Spend: $312,000 | Active Contract: Yes (expires Sep 2026)
   Risk: MEDIUM (certification renewal pending)

3. NEXUS TECHNOLOGIES (Score: 74.3/100)
   Delivery: 78% on-time (18/23 POs) .............. 78/100
   Quality: 94.0% acceptance rate .................. 80/100
   Pricing: 5% below category average .............. 90/100
   Compliance: No active contract .................. 60/100
   Invoice Accuracy: 85% match rate ................ 70/100
   Responsiveness: 3.5 day avg response ............ 55/100
   12-Month Spend: $189,000 | Active Contract: No
   Risk: HIGH (delivery concerns, no contract)
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query vendors, POs, receipts, invoices, contracts, and bids |
| `SN-NL-Search` | Natural language vendor search by category or capability |
| `SN-Read-Record` | Retrieve full vendor profile by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/core_company` | GET | Query vendor profiles |
| `/api/now/table/proc_po` | GET | Historical PO data per vendor |
| `/api/now/table/proc_po_item` | GET | Line item pricing analysis |
| `/api/now/table/proc_rec_slip_item` | GET | Delivery and quality metrics |
| `/api/now/table/ast_contract` | GET | Active contracts and compliance |
| `/api/now/table/sn_proc_invoice` | GET | Invoice accuracy metrics |
| `/api/now/table/sn_apo_invoice_case` | GET | Invoice exception history |
| `/api/now/table/proc_negotiation` | GET | Bid competitiveness data |

## Best Practices

- **Use Consistent Time Windows:** Evaluate all vendors over the same period (e.g., last 12 months) for fair comparison
- **Weight by Importance:** Adjust scorecard weights to match your organization's priorities (cost-driven vs. quality-driven)
- **Include Qualitative Data:** Supplement quantitative scores with work notes and case communications
- **Consider Diversity:** Track supplier diversity metrics and include as a scoring dimension if required by policy
- **Update Regularly:** Refresh scorecards quarterly to reflect recent performance trends
- **Document Exclusions:** If a vendor is excluded, record the reason for audit trail purposes
- **Risk Layering:** Evaluate both individual vendor risk and portfolio concentration risk

## Troubleshooting

### "Vendor has no PO history"

**Cause:** The vendor is new or has only been used through a different procurement channel
**Solution:** Check if the vendor exists under alternate names in `core_company`; review contract records which may predate PO data

### "Delivery metrics seem unreliable"

**Cause:** Expected delivery dates may not have been set on POs, or receipts were entered in bulk retroactively
**Solution:** Filter to POs where `expected_delivery` is not empty; focus on receipt date vs. PO expected date comparison

### "Scorecard dimensions have no data"

**Cause:** Some dimensions require data from tables that may not be populated for all vendors
**Solution:** Mark dimensions with insufficient data as "N/A" and adjust weights proportionally across remaining dimensions

### "Cannot compare pricing across vendors"

**Cause:** Different vendors supply different items, making direct price comparison difficult
**Solution:** Normalize by comparing unit prices for identical or equivalent items (same model/part_number); use category-level average as benchmark

## Examples

### Example 1: Vendor Selection for New RFP

**Scenario:** Sourcing manager needs to identify top 3 vendors to invite for an IT hardware RFP.

```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: vendor=true^vendor_type=IT Hardware^country=US
  fields: sys_id,name,vendor_type,city,state,vendor_rating
  limit: 20
```

For each vendor, run Steps 2-5, then score:

**Output:**
```
VENDOR SHORTLIST - IT Hardware RFP

Based on 12-month performance analysis:

INVITE LIST:
1. TechSupply Inc (Score: 88.5) - Preferred vendor, strong track record
2. Global Tech Solutions (Score: 82.1) - Good performance, competitive pricing
3. Dell Technologies (Score: 80.9) - Large catalog, reliable delivery

ALTERNATES:
4. Nexus Technologies (Score: 74.3) - Price competitive but delivery concerns
5. CDW Corporation (Score: 73.8) - Limited history, new relationship

NOT RECOMMENDED:
- QuickParts LLC (Score: 58.2) - 3 invoice disputes, 65% on-time delivery
```

### Example 2: Supplier Risk Assessment

**Scenario:** Quarterly risk review of top 5 suppliers by spend.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: ordered_date>=javascript:gs.beginningOfLastQuarter()^state!=cancelled
  fields: vendor,total_cost
  limit: 500
```

**Output:**
```
SUPPLIER RISK ASSESSMENT - Q1 2026

| Vendor           | Q1 Spend  | Concentration | Delivery | Contract | Risk  |
|------------------|-----------|---------------|----------|----------|-------|
| TechSupply Inc   | $456,000  | 28%           | 95%      | Active   | LOW   |
| CloudHost Corp   | $312,000  | 19%           | 92%      | Active   | LOW   |
| Global Parts Ltd | $245,000  | 15%           | 78%      | Expiring | HIGH  |
| Acme Office      | $198,000  | 12%           | 88%      | Active   | MED   |
| SecureTech       | $167,000  | 10%           | 91%      | Active   | LOW   |

ALERTS:
- Global Parts Ltd: Contract expires Apr 15, 2026 - initiate renewal
- Concentration Risk: TechSupply at 28% - consider diversifying
- Global Parts Ltd: 78% on-time delivery trending down from 85% last quarter
```

### Example 3: Category Benchmark Report

**Scenario:** Compare all office supply vendors against category benchmarks.

```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: vendor=true^vendor_type=Office Supplies
  fields: sys_id,name,vendor_rating
  limit: 10
```

**Output:**
```
CATEGORY BENCHMARK - Office Supplies

Category Average Unit Price Index: 100 (baseline)
Category Average Delivery Rate: 85%

| Vendor         | Price Index | Delivery | Quality | Overall | vs Avg |
|----------------|-------------|----------|---------|---------|--------|
| Staples        | 98          | 92%      | 98%     | 82.5    | +8%    |
| Office Depot   | 95          | 88%      | 96%     | 80.1    | +5%    |
| Amazon Bus.    | 88          | 95%      | 94%     | 79.8    | +5%    |
| Regional Sup.  | 105         | 78%      | 92%     | 68.2    | -10%   |

INSIGHT: Amazon Business offers lowest pricing and best delivery but lacks
dedicated account management. Staples leads on quality and responsiveness.
```

## Related Skills

- `procurement/sourcing-summarization` - Sourcing event analysis and bid comparison
- `procurement/purchase-order-summarization` - PO tracking and delivery monitoring
- `procurement/invoice-management` - Invoice matching and exception handling
- `procurement/procurement-summarization` - Overall procurement operations overview
