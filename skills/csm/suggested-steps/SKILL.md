---
name: suggested-steps
version: 1.0.0
description: Generate suggested resolution steps for CSM cases based on product, issue type, and historical resolutions from similar cases
author: Happy Technologies LLC
tags: [csm, resolution, suggested-steps, agent-assist, case-resolution, recommendations, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
    - SN-Update-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/csm_consumer
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_customerservice_case_stats
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Suggested Resolution Steps for CSM Cases

## Overview

This skill generates AI-powered resolution step recommendations for active customer service cases. By analyzing the case's product, issue category, customer context, and historical resolution patterns from similar cases, it produces a prioritized list of troubleshooting and resolution steps for agents. It covers:

- Analyzing the active case to extract issue classification, product, and symptoms
- Querying resolved cases with matching category, product, and keywords for resolution patterns
- Ranking resolution approaches by success rate and average resolution time
- Generating step-by-step resolution guidance tailored to the specific case context
- Incorporating relevant knowledge articles as reference material within steps
- Suggesting escalation paths when standard resolution steps are unlikely to resolve the issue

**When to use:** When an agent opens a new or in-progress case and needs guidance on resolution approach, when a junior agent encounters an unfamiliar issue type, or when automating resolution suggestions in Agent Workspace.

**Value proposition:** Reduces mean time to resolution by surfacing proven resolution approaches from historical data. Ensures consistent troubleshooting methodology across the support team regardless of agent experience level.

## Prerequisites

- **Plugins:** Customer Service Management (`com.sn_customerservice`) must be active
- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `csm_consumer`, `kb_knowledge`, and `sys_journal_field` tables
- **Data:** A sufficient volume of resolved cases (recommended 50+ per category) to generate meaningful suggestions
- **Knowledge:** Understanding of case categorization taxonomy and product catalog in your instance

## Procedure

### Step 1: Retrieve the Active Case Context

Fetch the full case details to understand the issue being reported.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,product,asset,contact_type,consumer,account,cause,escalation,opened_at
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=sys_id,number,short_description,description,state,priority,category,subcategory,product,asset,contact_type,consumer,account,cause,escalation,opened_at&sysparm_display_value=true
```

### Step 2: Retrieve Case Communications for Symptom Analysis

Pull customer-reported symptoms from comments and interactions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[case_sys_id]^elementINcomments,work_notes^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 15
```

```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=[case_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,channel,short_description,opened_at,state
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[case_sys_id]^elementINcomments,work_notes^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by&sysparm_limit=15

GET /api/now/table/interaction?sysparm_query=parent=[case_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,channel,short_description,opened_at,state&sysparm_limit=5&sysparm_display_value=true
```

### Step 3: Query Historical Resolutions from Similar Cases

Find resolved cases with matching criteria to extract proven resolution patterns.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[case_category]^subcategory=[case_subcategory]^product=[case_product]^state=3^close_notesISNOTEMPTY^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,close_notes,resolution_code,cause,opened_at,closed_at
  limit: 15
```

For broader matches when specific results are insufficient:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[case_category]^state=3^close_notesISNOTEMPTY^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,close_notes,resolution_code,cause
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=category=[case_category]^subcategory=[case_subcategory]^product=[case_product]^state=3^close_notesISNOTEMPTY^ORDERBYDESCclosed_at&sysparm_fields=sys_id,number,short_description,close_notes,resolution_code,cause,opened_at,closed_at&sysparm_limit=15&sysparm_display_value=true
```

### Step 4: Extract Work Notes from Top-Matching Historical Cases

Retrieve the resolution work notes from the most relevant historical cases.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[matched_case_sys_id]^element=work_notes^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 10
```

Repeat for the top 3-5 matching cases to build a resolution pattern corpus.

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[matched_case_sys_id]^element=work_notes^ORDERBYsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=10
```

### Step 5: Search for Relevant Knowledge Articles

Find KB articles that can supplement resolution steps.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [case_short_description] [case_product]
  table: kb_knowledge
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=short_descriptionLIKE[key_terms]^workflow_state=published^ORDERBYDESCsys_view_count&sysparm_fields=sys_id,number,short_description,text,sys_view_count,rating&sysparm_limit=5&sysparm_display_value=true
```

### Step 6: Analyze Consumer History for Context

Check if the consumer has experienced this issue before or has relevant history.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: consumer=[consumer_sys_id]^category=[case_category]^state=3
  fields: sys_id,number,short_description,close_notes,resolution_code,closed_at
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=consumer=[consumer_sys_id]^category=[case_category]^state=3&sysparm_fields=sys_id,number,short_description,close_notes,resolution_code,closed_at&sysparm_limit=5&sysparm_display_value=true
```

### Step 7: Generate and Present Suggested Resolution Steps

Compile the analysis into a structured resolution recommendation.

```
=== SUGGESTED RESOLUTION STEPS ===
Case: CS0012345 | Category: Portal Access | Product: Customer Portal v3.2

CONFIDENCE: High (based on 12 similar resolved cases)
AVG RESOLUTION TIME: 45 minutes

RECOMMENDED STEPS:
Step 1: Verify Account Status [5 min]
  - Check consumer account is active and not locked
  - Verify email address matches SSO identity provider
  - Reference: KB0034521 - Account Verification Procedure

Step 2: Clear Browser Session Data [5 min]
  - Guide customer to clear cache and cookies for portal domain
  - Recommend trying incognito/private browsing mode
  - If phone/chat: Walk through browser settings step by step

Step 3: Test Portal Access [5 min]
  - Have customer attempt login with cleared session
  - If successful, document browser/version for pattern tracking
  - If failed, proceed to Step 4

Step 4: Check SSO Configuration [15 min]
  - Review SSO logs for authentication failures
  - Verify SAML assertion attributes match expected values
  - Check for recent SSO provider configuration changes
  - Reference: KB0034589 - SSO Troubleshooting Guide

Step 5: Escalation Path [if Steps 1-4 fail]
  - Escalate to Identity & Access Management team
  - Include: SSO logs, browser details, error screenshots
  - SLA Note: P2 cases require resolution within 8 business hours

ALTERNATIVE APPROACHES (from historical cases):
- 30% of similar cases resolved by cache clear alone (Step 2)
- 25% required SSO config fix (Step 4)
- 20% were account lockout issues (Step 1)
- 15% required browser update/change
- 10% escalated to engineering

PREVIOUSLY TRIED (this customer):
- CS0011234 (Jan 15): Same issue resolved by clearing cookies
  NOTE: Recurring issue may indicate deeper SSO integration problem
```

### Step 8: Add Suggested Steps to Case Work Notes

Post the generated steps to the case as a work note for agent reference.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields:
    work_notes: "[AI Suggested Steps] Based on 12 similar resolved cases:\n1. Verify account status (check lockout, email match)\n2. Clear browser session data\n3. Test portal access\n4. Check SSO configuration if persists\n5. Escalate to IAM team if unresolved\nRef: KB0034521, KB0034589\nConfidence: High | Avg resolution: 45 min"
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_customerservice_case/{case_sys_id}
Content-Type: application/json

{
  "work_notes": "[AI Suggested Steps] Based on 12 similar resolved cases:\n1. Verify account status\n2. Clear browser session data\n3. Test portal access\n4. Check SSO configuration\n5. Escalate to IAM if unresolved"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Semantic search for similar cases and relevant KB articles |
| `SN-Query-Table` | Structured queries for historical cases, work notes, and interactions |
| `SN-Read-Record` | Retrieve the active case details by sys_id |
| `SN-Update-Record` | Post suggested steps as work notes on the case |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET/PATCH | Query cases and update with suggestions |
| `/api/now/table/interaction` | GET | Retrieve case interactions for context |
| `/api/now/table/csm_consumer` | GET | Consumer history and profile |
| `/api/now/table/kb_knowledge` | GET | Knowledge article search |
| `/api/now/table/sys_journal_field` | GET | Work notes and comments for resolution details |

## Best Practices

- **Rank by success rate:** Order suggested steps by historical resolution frequency, putting the most commonly successful approach first
- **Include time estimates:** Provide expected duration for each step so agents can plan their approach and manage SLAs
- **Reference KB articles:** Link relevant knowledge articles within each step for agents who need deeper guidance
- **Show confidence level:** Indicate how many similar cases the suggestions are based on so agents can gauge reliability
- **Flag recurring issues:** If the same customer has experienced the issue before, highlight the pattern and suggest preventive measures
- **Respect case priority:** Adjust step ordering and escalation thresholds based on case priority (P1 cases should suggest escalation earlier)
- **Update with outcomes:** Track which suggested steps actually resolved the case to improve future recommendations
- **Avoid over-automation:** Present steps as suggestions, not mandates; agents should apply judgment based on the specific case context

## Troubleshooting

### "No similar cases found"

**Cause:** The case category/product combination is new or rare, or case data is sparse.
**Solution:** Broaden the search by removing product or subcategory filters. Fall back to category-only matching or use `SN-NL-Search` with the case description for semantic matching.

### "Suggested steps are too generic"

**Cause:** Historical cases have vague or inconsistent close notes.
**Solution:** Weight cases with detailed work notes more heavily. Extract step-by-step details from work notes rather than relying solely on close_notes summaries.

### "Resolution confidence is low"

**Cause:** Fewer than 5 similar resolved cases available, or resolution patterns are inconsistent.
**Solution:** Display the low confidence warning to the agent. Suggest they consult with a senior agent or SME and document the resolution thoroughly for future cases.

### "Steps reference outdated KB articles"

**Cause:** Knowledge articles may have been retired or superseded.
**Solution:** Check `workflow_state=published` and `valid_to` date on KB articles before including them. Flag articles approaching expiration.

## Examples

### Example 1: Network Connectivity Case

**Input Case:** CS0056789 - "Customer unable to connect to VPN after OS update"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=network^subcategoryLIKEvpn^state=3^close_notesISNOTEMPTY^ORDERBYDESCclosed_at
  fields: sys_id,number,short_description,close_notes,resolution_code
  limit: 15
```

**Output:**
```
SUGGESTED STEPS (Confidence: High - 18 similar cases)
1. Verify VPN client version compatibility with new OS [5 min]
2. Reinstall VPN client with latest version [10 min]
3. Check network adapter settings post-update [5 min]
4. Reset TCP/IP stack and flush DNS [5 min]
5. Escalate to Network Engineering if unresolved [with logs]
```

### Example 2: Billing Dispute Case

**Input Case:** CS0056790 - "Incorrect charges on monthly invoice"

```
Tool: SN-NL-Search
Parameters:
  query: incorrect charges monthly invoice billing dispute
  table: sn_customerservice_case
  limit: 10
```

**Output:**
```
SUGGESTED STEPS (Confidence: Medium - 7 similar cases)
1. Pull invoice details and compare with contract terms [10 min]
2. Check for duplicate charges or proration errors [10 min]
3. Verify recent plan/tier changes against billing cycle [5 min]
4. Issue credit if discrepancy confirmed [5 min]
5. Escalate to Finance team for complex billing adjustments
```

### Example 3: Product Feature Request Routing

**Input Case:** CS0056791 - "Customer requesting bulk export feature"

**Output:**
```
SUGGESTED STEPS (Confidence: Low - 3 similar cases)
1. Confirm the specific export requirements (format, volume, frequency)
2. Check product roadmap for planned export enhancements
3. Document the request as an enhancement in the product backlog
4. Provide workaround: scheduled report with CSV export
5. Set customer expectation and follow-up timeline
NOTE: This is a feature request, not a defect. Route to Product team.
```

## Related Skills

- `csm/case-summarization` - Summarize case context before generating steps
- `csm/sidebar-summarization` - Quick sidebar context for step generation
- `csm/resolution-notes` - Document resolution after steps are applied
- `csm/kb-generation` - Generate KB articles from successful resolution steps
- `csm/sentiment-analysis` - Gauge customer sentiment to adjust step urgency
