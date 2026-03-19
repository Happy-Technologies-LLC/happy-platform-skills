---
name: sourcing-summarization
version: 1.0.0
description: Summarize sourcing events including bid comparisons, vendor evaluations, negotiation status, award recommendations, and RFP/RFQ process support
author: Happy Technologies LLC
tags: [procurement, sourcing, rfp, rfq, bid-analysis, vendor-evaluation, negotiation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/proc_sourcing_event
    - /api/now/table/proc_negotiation
    - /api/now/table/core_company
    - /api/now/table/proc_po
    - /api/now/table/ast_contract
    - /api/now/table/sn_spo_requisition
    - /api/now/table/sc_req_item
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Sourcing Summarization

## Overview

This skill provides a structured approach to summarizing sourcing events and negotiations in ServiceNow Sourcing and Procurement Operations. It helps you:

- Retrieve and consolidate sourcing event details from `proc_sourcing_event`
- Compare vendor bids side-by-side with pricing, terms, and compliance data
- Track negotiation rounds and counteroffers via `proc_negotiation`
- Evaluate vendors against weighted scoring criteria
- Generate award recommendations based on total cost of ownership and qualitative factors
- Support RFP/RFQ lifecycle management from creation through award

**When to use:** When sourcing managers need to review active sourcing events, compare vendor proposals, track negotiation progress, or prepare award recommendation summaries.

## Prerequisites

- **Roles:** `sn_procurement.sourcing_manager`, `sn_procurement.analyst`, or `sourcing_admin`
- **Plugins:** `com.sn_sourcing` (Sourcing) and `com.sn_procurement` activated
- **Access:** Read access to `proc_sourcing_event`, `proc_negotiation`, `core_company`, `ast_contract`
- **Knowledge:** Familiarity with your organization's sourcing policies, evaluation criteria, and approval thresholds

## Procedure

### Step 1: Retrieve Sourcing Events

Query active sourcing events to understand the current sourcing pipeline.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_sourcing_event
  query: active=true^ORDERBYDESCsys_updated_on
  fields: sys_id,number,short_description,state,type,category,assigned_to,start_date,end_date,estimated_value,currency,vendor_count,bid_count,award_status
  limit: 25
```

To filter by event type (RFP, RFQ, RFI):
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_sourcing_event
  query: type=rfp^active=true
  fields: sys_id,number,short_description,state,category,start_date,end_date,estimated_value,vendor_count,bid_count
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/proc_sourcing_event?sysparm_query=active=true^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,number,short_description,state,type,category,assigned_to,start_date,end_date,estimated_value,currency,vendor_count,bid_count,award_status&sysparm_limit=25&sysparm_display_value=true
```

### Step 2: Retrieve a Specific Sourcing Event

Get full details for a single sourcing event.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: proc_sourcing_event
  sys_id: [event_sys_id]
  fields: sys_id,number,short_description,description,state,type,category,assigned_to,assignment_group,start_date,end_date,bid_deadline,estimated_value,currency,evaluation_criteria,scoring_method,vendor_count,bid_count,award_status,award_date,awarded_vendor,terms_and_conditions
```

**Using REST API:**
```bash
GET /api/now/table/proc_sourcing_event/[event_sys_id]?sysparm_fields=sys_id,number,short_description,description,state,type,category,assigned_to,start_date,end_date,bid_deadline,estimated_value,currency,evaluation_criteria,scoring_method,vendor_count,bid_count,award_status,award_date,awarded_vendor,terms_and_conditions&sysparm_display_value=true
```

### Step 3: Retrieve Vendor Bids and Proposals

Query negotiations linked to the sourcing event to get vendor bids.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_negotiation
  query: sourcing_event=[event_sys_id]^ORDERBYtotal_bid_amount
  fields: sys_id,number,vendor,state,total_bid_amount,currency,round,submitted_date,compliance_status,technical_score,commercial_score,overall_score,notes,award_recommendation
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/proc_negotiation?sysparm_query=sourcing_event=[event_sys_id]^ORDERBYtotal_bid_amount&sysparm_fields=sys_id,number,vendor,state,total_bid_amount,currency,round,submitted_date,compliance_status,technical_score,commercial_score,overall_score,notes,award_recommendation&sysparm_limit=50&sysparm_display_value=true
```

### Step 4: Retrieve Vendor Details and History

For each bidding vendor, get their company profile and past performance.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: core_company
  query: sys_id=[vendor_sys_id]
  fields: sys_id,name,vendor_type,city,state,country,stock_symbol,vendor_rating,notes,contact
  limit: 1
```

Check vendor's existing contracts:
```
Tool: SN-Query-Table
Parameters:
  table_name: ast_contract
  query: vendor=[vendor_sys_id]^state=active
  fields: sys_id,number,short_description,starts,ends,cost,state,contract_type
  limit: 10
```

Check vendor's PO history:
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: vendor=[vendor_sys_id]^ordered_date>=javascript:gs.beginningOfLast12Months()^state!=cancelled
  fields: sys_id,number,total_cost,state,ordered_date
  limit: 50
```

**Using REST API:**
```bash
# Vendor profile
GET /api/now/table/core_company/[vendor_sys_id]?sysparm_fields=sys_id,name,vendor_type,city,country,vendor_rating,contact&sysparm_display_value=true

# Active contracts with vendor
GET /api/now/table/ast_contract?sysparm_query=vendor=[vendor_sys_id]^state=active&sysparm_fields=sys_id,number,short_description,starts,ends,cost,contract_type&sysparm_limit=10&sysparm_display_value=true

# PO history
GET /api/now/table/proc_po?sysparm_query=vendor=[vendor_sys_id]^ordered_date>=javascript:gs.beginningOfLast12Months()^state!=cancelled&sysparm_fields=number,total_cost,state,ordered_date&sysparm_limit=50&sysparm_display_value=true
```

### Step 5: Compare Bids Side-by-Side

Build a comparison matrix from the negotiation data:

```
=== BID COMPARISON MATRIX ===
Sourcing Event: SE0001234 - Enterprise Network Equipment RFP
Estimated Value: $500,000 | Bid Deadline: Mar 10, 2026

| Criteria (Weight)      | Vendor A: Cisco  | Vendor B: Juniper | Vendor C: Arista |
|------------------------|------------------|-------------------|------------------|
| Total Bid Amount       | $485,000         | $462,000          | $448,500         |
| Technical Score (40%)  | 92/100           | 88/100            | 85/100           |
| Commercial Score (30%) | 78/100           | 85/100            | 90/100           |
| Compliance             | Full             | Full              | Partial*         |
| Delivery Timeline      | 6 weeks          | 8 weeks           | 5 weeks          |
| Warranty               | 3 years          | 2 years           | 3 years          |
| Weighted Total         | 86.4             | 86.1              | 86.5             |
| Recommendation         | -                | -                 | Conditional**    |

*Arista: Missing ISO 27001 certification
**Conditional on compliance gap resolution
```

### Step 6: Track Negotiation Rounds

Review negotiation history for ongoing events.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_negotiation
  query: sourcing_event=[event_sys_id]^vendor=[vendor_sys_id]^ORDERBYround
  fields: sys_id,round,total_bid_amount,submitted_date,state,notes,commercial_score,technical_score
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/proc_negotiation?sysparm_query=sourcing_event=[event_sys_id]^vendor=[vendor_sys_id]^ORDERBYround&sysparm_fields=sys_id,round,total_bid_amount,submitted_date,state,notes,commercial_score,technical_score&sysparm_limit=10&sysparm_display_value=true
```

### Step 7: Build the Sourcing Summary

Assemble findings into a structured report:

```
=== SOURCING EVENT SUMMARY ===
Event: SE0001234 | Type: RFP
Title: [short_description]
State: [state] | Category: [category]
Owner: [assigned_to] | Start: [start_date] | Deadline: [end_date]
Estimated Value: [currency] [estimated_value]

PARTICIPATION:
Vendors Invited: [vendor_count]
Bids Received: [bid_count]
Response Rate: [pct]%

BID RANKING (by weighted score):
1. [Vendor C] - $448,500 - Score: 86.5 - CONDITIONAL
2. [Vendor A] - $485,000 - Score: 86.4 - COMPLIANT
3. [Vendor B] - $462,000 - Score: 86.1 - COMPLIANT

NEGOTIATION STATUS:
[Vendor A]: Round 3 complete - final offer received
[Vendor B]: Round 2 - counteroffer pending
[Vendor C]: Round 3 complete - compliance remediation in progress

AWARD RECOMMENDATION:
Recommended Vendor: [vendor_name]
Rationale: [scoring rationale, compliance, delivery, total cost of ownership]
Savings vs Estimate: $[amount] ([pct]%)

NEXT STEPS:
- [pending actions]
- [approval requirements]
- [timeline to award]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query sourcing events, negotiations, vendors, and contracts |
| `SN-NL-Search` | Natural language search (e.g., "find open RFPs for networking equipment") |
| `SN-Read-Record` | Retrieve full details of a single sourcing event |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/proc_sourcing_event` | GET | Query sourcing events |
| `/api/now/table/proc_negotiation` | GET | Retrieve vendor bids and negotiation rounds |
| `/api/now/table/core_company` | GET | Vendor profiles and ratings |
| `/api/now/table/ast_contract` | GET | Existing vendor contracts |
| `/api/now/table/proc_po` | GET | Historical PO data for vendor assessment |
| `/api/now/table/sys_journal_field` | GET | Sourcing event notes and communications |

## Best Practices

- **Weight Criteria Transparently:** Document evaluation weights before reviewing bids to avoid bias
- **Include Total Cost of Ownership:** Look beyond bid price to include warranty, maintenance, training, and implementation costs
- **Verify Compliance Early:** Flag compliance gaps in the first round to give vendors time to remediate
- **Track All Rounds:** Record every negotiation round to maintain an audit trail
- **Benchmark Against Market:** Compare bids to historical spend and market rates for the category
- **Involve Stakeholders:** Include technical evaluators, legal, and finance in scoring for comprehensive assessment
- **Document Rationale:** Always record the reasoning behind award recommendations for audit purposes

## Troubleshooting

### "Sourcing event has no negotiations"

**Cause:** Bids may not have been submitted yet, or they are stored in a custom table
**Solution:** Verify the bid deadline has passed; check if your instance uses a custom bid table extending `proc_negotiation`

### "Vendor scores are all zero"

**Cause:** Scoring has not been completed or is managed outside ServiceNow
**Solution:** Check if evaluation is done via a separate scoring module or external spreadsheet; scores may need manual entry

### "Cannot find vendor in core_company"

**Cause:** The vendor may not be registered in ServiceNow yet
**Solution:** Search `core_company` by name with `nameLIKE[vendor_name]`; the vendor may need to be created before bid submission

### "Historical PO data incomplete"

**Cause:** The vendor may have been used under a different company record or acquired
**Solution:** Check for alternate company names or parent/subsidiary relationships in `core_company`

## Examples

### Example 1: Active Sourcing Pipeline Summary

**Scenario:** Sourcing director needs an overview of all active sourcing events.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_sourcing_event
  query: active=true^ORDERBYend_date
  fields: number,short_description,type,state,estimated_value,bid_count,end_date,assigned_to
  limit: 20
```

**Output:**
```
SOURCING PIPELINE - Mar 19, 2026

ACTIVE EVENTS: 8 total ($3.2M estimated value)

EVALUATION PHASE (3):
  SE0001234 - Enterprise Network Equipment (RFP) - $500K - 3 bids - Due: Mar 25
  SE0001240 - Cloud Hosting Services (RFP) - $1.2M - 5 bids - Due: Mar 28
  SE0001245 - Office Furniture Refresh (RFQ) - $85K - 4 bids - Due: Mar 22

BIDDING OPEN (3):
  SE0001250 - Security Consulting (RFP) - $400K - 2 bids so far - Closes: Apr 5
  SE0001252 - Print Services (RFQ) - $120K - 0 bids - Closes: Apr 10
  SE0001255 - Catering Services (RFQ) - $95K - 3 bids so far - Closes: Apr 2

AWARD PENDING (2):
  SE0001220 - Data Center Hardware (RFP) - $800K - Recommended: Dell
  SE0001228 - Janitorial Services (RFQ) - $45K - Recommended: CleanCo

ATTENTION: SE0001252 has zero bids with 3 weeks to deadline - consider expanding vendor list.
```

### Example 2: Bid Comparison for Award Decision

**Scenario:** Evaluate bids for SE0001234 (Enterprise Network Equipment).

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_negotiation
  query: sourcing_event.number=SE0001234^round=3
  fields: vendor,total_bid_amount,technical_score,commercial_score,overall_score,compliance_status,state
  limit: 10
```

**Output:**
```
SE0001234 - AWARD RECOMMENDATION

BID COMPARISON (Final Round):
| Vendor    | Bid Amount | Tech (40%) | Comm (30%) | Delivery (20%) | Risk (10%) | Total |
|-----------|-----------|------------|------------|----------------|------------|-------|
| Cisco     | $485,000  | 92         | 78         | 80             | 90         | 85.4  |
| Arista    | $448,500  | 85         | 90         | 92             | 75         | 86.5  |
| Juniper   | $462,000  | 88         | 85         | 78             | 85         | 84.9  |

RECOMMENDATION: Arista Networks
- Lowest price ($448,500 - 10.3% below estimate)
- Highest weighted score (86.5)
- Fastest delivery (5 weeks)
- NOTE: Requires ISO 27001 certification by Q2 (mitigation plan submitted)

SAVINGS: $51,500 vs estimate | $36,500 vs next lowest bid
```

### Example 3: Negotiation History Tracking

**Scenario:** Track negotiation progress with a specific vendor.

```
Tool: SN-Query-Table
Parameters:
  table_name: proc_negotiation
  query: sourcing_event.number=SE0001234^vendor.name=Cisco Systems^ORDERBYround
  fields: round,total_bid_amount,submitted_date,state,notes
  limit: 5
```

**Output:**
```
NEGOTIATION HISTORY - SE0001234 / Cisco Systems

Round 1 (Feb 15): $520,000 - Initial proposal
  Notes: Standard pricing, 3-year warranty, 8-week delivery

Round 2 (Mar 1): $498,000 - Revised after feedback
  Notes: 4.2% reduction, improved delivery to 7 weeks

Round 3 (Mar 12): $485,000 - Final offer
  Notes: 6.7% total reduction, added training package, 6-week delivery

TOTAL SAVINGS THROUGH NEGOTIATION: $35,000 (6.7%)
```

## Related Skills

- `procurement/supplier-recommendation` - Vendor scoring and recommendation engine
- `procurement/purchase-order-summarization` - Track POs resulting from sourcing awards
- `procurement/procurement-summarization` - Overall procurement pipeline overview
- `procurement/invoice-management` - Invoice processing for sourced contracts
