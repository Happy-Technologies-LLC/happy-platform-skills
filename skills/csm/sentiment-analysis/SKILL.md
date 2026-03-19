---
name: sentiment-analysis
version: 1.0.0
description: Analyze customer sentiment across CSM cases, communications, and interactions to track sentiment progression, identify escalation patterns, and flag at-risk cases
author: Happy Technologies LLC
tags: [csm, sentiment, analysis, customer-experience, escalation, risk-detection]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_email
    - /api/now/table/customer_account
    - /api/now/table/csm_consumer
    - /api/now/table/customer_contact
    - /api/now/table/sn_customerservice_sla
  native:
    - Bash
complexity: advanced
estimated_time: 10-20 minutes
---

# Sentiment Analysis

## Overview

This skill provides a systematic approach to analyzing customer sentiment across CSM case communications and interactions. It helps you:

- Collect and analyze all customer-facing communications (emails, chat transcripts, comments, portal submissions)
- Assess sentiment polarity (positive, neutral, negative) and intensity across each communication
- Track sentiment progression over the case lifecycle to identify trends (improving, stable, deteriorating)
- Detect escalation risk indicators such as repeated contacts, negative language patterns, and SLA breaches
- Flag at-risk cases and accounts that require immediate attention or proactive outreach
- Provide sentiment scoring for account health dashboards and management reporting

**When to use:** When a CSM manager needs to assess customer satisfaction trends, when triaging cases for priority, when identifying accounts at churn risk, or when evaluating agent performance based on customer outcomes.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `sys_journal_field`, `sys_email`, `customer_account`, `csm_consumer`, and `sn_customerservice_sla` tables
- **Knowledge:** Understanding of sentiment analysis concepts, CSM case lifecycle, and your organization's escalation policies

## Procedure

### Step 1: Retrieve the Case and Customer Context

Fetch the case record and customer information to establish baseline context.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,opened_at,opened_by,resolved_at,closed_at,escalation,severity,reassignment_count,reopen_count,contact_type,sla_due
```

```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_id=[account_sys_id]
  fields: sys_id,name,customer_tier,industry,notes
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,opened_at,escalation,severity,reassignment_count,reopen_count,contact_type,sla_due&sysparm_display_value=true

GET /api/now/table/customer_account/{account_sys_id}?sysparm_fields=name,customer_tier,industry,notes&sysparm_display_value=true
```

### Step 2: Collect Customer Comments and Communications

Retrieve all customer-facing comments (additional comments / customer-visible entries).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=comments^ORDERBYsys_created_on
  fields: sys_id,value,sys_created_on,sys_created_by,element
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=comments^ORDERBYsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by,element&sysparm_limit=100
```

### Step 3: Retrieve Email Communications

Pull inbound emails from the customer for sentiment analysis.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<case_sys_id>^type=received^ORDERBYsys_created_on
  fields: sys_id,subject,body_text,sys_created_on,sys_created_by,importance,type
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=<case_sys_id>^type=received^ORDERBYsys_created_on&sysparm_fields=subject,body_text,sys_created_on,importance,type&sysparm_limit=30&sysparm_display_value=true
```

### Step 4: Retrieve Chat and Interaction Transcripts

Pull chat interaction entries for analysis.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=<case_sys_id>^ORDERBYsys_created_on
  fields: sys_id,number,channel,state,opened_at,closed_at,short_description
  limit: 20
```

For each chat interaction, retrieve the transcript:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction_entry
  query: interaction=<interaction_sys_id>^ORDERBYsys_created_on
  fields: sys_id,message,type,sys_created_on,sys_created_by,initiated_from
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=parent=<case_sys_id>^ORDERBYsys_created_on&sysparm_fields=sys_id,number,channel,state,opened_at,closed_at&sysparm_limit=20&sysparm_display_value=true

GET /api/now/table/interaction_entry?sysparm_query=interaction=<interaction_sys_id>^ORDERBYsys_created_on&sysparm_fields=message,type,sys_created_on,sys_created_by&sysparm_limit=100
```

### Step 5: Check SLA Compliance and Escalation History

SLA breaches and escalations are strong sentiment indicators.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<case_sys_id>
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,start_time,end_time
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_sla?sysparm_query=task=<case_sys_id>&sysparm_fields=sla,stage,has_breached,planned_end_time,percentage,business_percentage&sysparm_limit=10&sysparm_display_value=true
```

### Step 6: Analyze Customer's Case History for Patterns

Check if the customer has a pattern of negative experiences across multiple cases.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: consumer=[consumer_sys_id]^ORDERBYDESCopened_at
  fields: number,short_description,state,priority,escalation,reopen_count,reassignment_count,opened_at,closed_at,resolution_code
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=consumer=<consumer_sys_id>^ORDERBYDESCopened_at&sysparm_fields=number,short_description,state,priority,escalation,reopen_count,reassignment_count,opened_at,closed_at,resolution_code&sysparm_limit=20&sysparm_display_value=true
```

### Step 7: Perform Sentiment Analysis and Generate Report

Analyze all collected communications for sentiment indicators and produce a structured assessment.

**Sentiment Indicator Keywords:**

| Negative Indicators | Neutral Indicators | Positive Indicators |
|---------------------|--------------------|---------------------|
| frustrated, unacceptable | following up, checking in | thank you, appreciate |
| disappointed, angry | any update, status | excellent, great job |
| escalate, manager | when will, timeline | resolved, working now |
| unresolved, still broken | can you confirm | helpful, impressed |
| worst, terrible, awful | need more info | recommend, satisfied |
| cancel, legal, lawsuit | please advise | above and beyond |
| wasting my time | looking forward | quick response |
| incompetent, useless | per our discussion | keep up the good work |

**Risk Factor Scoring:**

| Factor | Score | Condition |
|--------|-------|-----------|
| SLA Breached | +3 | Any SLA in breached state |
| Escalation Active | +2 | Escalation level > 0 |
| Reopen Count > 0 | +2 | Case has been reopened |
| Reassignment Count > 3 | +1 | Multiple team handoffs |
| Negative Email Tone | +2 | Per negative email detected |
| High Priority (P1/P2) | +1 | Priority is 1 or 2 |
| Multiple Cases Open | +1 | Customer has > 2 open cases |
| Case Age > 7 days | +1 | Case open longer than expected |

**Risk Levels:**
- Score 0-2: Low Risk (Green)
- Score 3-5: Medium Risk (Yellow)
- Score 6-8: High Risk (Orange)
- Score 9+: Critical Risk (Red)

**Output Report:**

```
=== SENTIMENT ANALYSIS REPORT ===
Case: [number] | Customer: [name] | Account: [account_name]
Account Tier: [tier] | Case Age: [days] days
Analysis Date: [current_date]

OVERALL SENTIMENT: [Positive/Neutral/Negative]
RISK SCORE: [score]/15 ([Low/Medium/High/Critical])
TREND: [Improving/Stable/Deteriorating]

COMMUNICATION SENTIMENT TIMELINE:
Date       | Channel | Sentiment | Key Indicators
-----------+---------+-----------+------------------
[date_1]   | Email   | Negative  | "frustrated", "unacceptable"
[date_2]   | Chat    | Negative  | "still not working", "escalate"
[date_3]   | Email   | Neutral   | "any update on timeline"
[date_4]   | Comment | Positive  | "thank you for the update"

SENTIMENT PROGRESSION:
[date_1] ████████░░ Negative (-0.7)
[date_2] ███████░░░ Negative (-0.6)
[date_3] █████░░░░░ Neutral  (-0.1)
[date_4] ███░░░░░░░ Positive (+0.4)
Trend: IMPROVING ↑

RISK FACTORS:
[✓] SLA Breached (Response SLA) .............. +3
[✓] Escalation Level 1 ...................... +2
[✗] Case Reopened ............................ +0
[✓] Reassignment Count: 4 ................... +1
[✓] Negative Communications: 2 .............. +4
[✗] High Priority ............................ +0
[✗] Multiple Open Cases ..................... +0
[✓] Case Age: 12 days ....................... +1
                                    Total: 11 (CRITICAL)

ACCOUNT HEALTH INDICATORS:
- Total Cases (90 days): [count]
- Open Cases: [count]
- Average Resolution Time: [days]
- Escalation Rate: [percentage]%
- Reopen Rate: [percentage]%

KEY OBSERVATIONS:
1. [observation about sentiment trend]
2. [observation about risk factors]
3. [observation about account health]

RECOMMENDED ACTIONS:
1. [action based on sentiment analysis]
2. [action based on risk score]
3. [action based on account health]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Search for cases by sentiment-related keywords or descriptions |
| `SN-Query-Table` | Retrieve communications, case history, SLA data |
| `SN-Read-Record` | Fetch individual case or account records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Case details and history |
| `/api/now/table/sys_journal_field` | GET | Customer comments and work notes |
| `/api/now/table/sys_email` | GET | Email communications |
| `/api/now/table/interaction` | GET | Chat and phone interactions |
| `/api/now/table/interaction_entry` | GET | Chat transcript messages |
| `/api/now/table/sn_customerservice_sla` | GET | SLA compliance data |
| `/api/now/table/customer_account` | GET | Account tier and health |
| `/api/now/table/csm_consumer` | GET | Consumer profile data |

## Best Practices

- **Analyze all channels:** Customer sentiment may differ across email, chat, and portal; aggregate all channels for an accurate picture
- **Weight recent communications higher:** The most recent interaction is more indicative of current sentiment than older ones
- **Consider context:** A terse message may be neutral rather than negative; always consider the full conversation thread
- **Track sentiment over time:** A single negative message is less concerning than a sustained downward trend
- **Cross-reference with metrics:** Combine sentiment analysis with SLA data, reassignment counts, and reopen counts for a holistic view
- **Account-level aggregation:** Individual case sentiment should roll up to an account-level health score
- **Flag proactively:** Don't wait for explicit escalation requests; flag cases where sentiment is deteriorating before the customer escalates
- **Respect cultural differences:** Tone and directness vary by culture; avoid false positives from direct communication styles
- **Document findings:** Record sentiment analysis results as work notes for team awareness

## Troubleshooting

### "No customer comments found"

**Cause:** The case may use work notes exclusively, or comments may be stored in a different field
**Solution:** Check both `element=comments` and `element=work_notes` in `sys_journal_field`. Also check `sys_email` for customer communications. Some organizations use custom journal fields.

### "Chat transcripts are empty"

**Cause:** Chat messages may be in a different table depending on the messaging framework
**Solution:** Try querying `live_message` table: `sysparm_query=group=<interaction_sys_id>`. Also check `sys_cs_message` for Customer Service Messaging (CSM) chats.

### "Sentiment analysis seems inaccurate"

**Cause:** Automated keyword-based analysis may miss sarcasm, context, or domain-specific language
**Solution:** Supplement keyword detection with contextual analysis. Look at the full conversation thread rather than individual messages. Check for follow-up messages that clarify intent.

### "Account health data incomplete"

**Cause:** Historical cases may have been archived or the consumer record may not link all cases
**Solution:** Query cases by both `consumer` and `account` fields to capture all related cases. Check `contact` field as well since some cases may link to `customer_contact` instead of `csm_consumer`.

## Examples

### Example 1: Single Case Sentiment Analysis

**Scenario:** Analyze sentiment for a billing dispute case that has been open for 10 days.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0090100
  fields: sys_id,number,short_description,state,priority,escalation,contact,account,consumer,opened_at,reopen_count,reassignment_count,sla_due
  limit: 1
```

**Step 2 - Get customer emails:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<sys_id>^type=received^ORDERBYsys_created_on
  fields: body_text,sys_created_on,subject
  limit: 20
```

**Step 3 - Check SLA:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<sys_id>
  fields: sla,stage,has_breached,percentage
  limit: 5
```

**Output:**
```
SENTIMENT ANALYSIS - CS0090100 (Billing Dispute)
Customer: Robert Chen | Account: Meridian Inc. (Gold)

OVERALL SENTIMENT: Negative (deteriorating)
RISK SCORE: 9/15 (CRITICAL)

TIMELINE:
Mar 09 | Email | Neutral  | "I noticed an incorrect charge..."
Mar 12 | Email | Negative | "I haven't heard back, this is urgent"
Mar 15 | Email | Negative | "This is unacceptable, 6 days with no response"
Mar 18 | Email | Negative | "I'm considering escalating to management"

RISK FACTORS: SLA Breached (+3), Negative emails x3 (+6)
TREND: Deteriorating ↓

RECOMMENDED ACTIONS:
1. Immediate manager outreach call to Robert Chen
2. Fast-track billing adjustment with finance team
3. Provide concession or credit for service failure
```

### Example 2: Account-Level Sentiment Dashboard

**Scenario:** Generate sentiment overview for all open cases under a key account.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: account=[account_sys_id]^stateNOT IN6,7,8^ORDERBYpriority
  fields: sys_id,number,short_description,state,priority,escalation,contact,opened_at,reopen_count,reassignment_count
  limit: 50
```

**Output:**
```
ACCOUNT SENTIMENT DASHBOARD - GLOBEX CORPORATION
Tier: Platinum | Open Cases: 7 | Avg Age: 8.3 days

CASE SENTIMENT SUMMARY:
Case       | Priority | Age  | Sentiment | Risk
-----------+----------+------+-----------+--------
CS0089001  | P1       | 3d   | Negative  | HIGH
CS0089234  | P2       | 5d   | Neutral   | MEDIUM
CS0089500  | P2       | 12d  | Negative  | CRITICAL
CS0089801  | P3       | 7d   | Neutral   | LOW
CS0090010  | P3       | 2d   | Positive  | LOW
CS0090150  | P3       | 14d  | Negative  | HIGH
CS0090200  | P4       | 1d   | Neutral   | LOW

ACCOUNT HEALTH: AT RISK
- 3 of 7 cases have negative sentiment
- 1 case in critical risk state
- Escalation rate: 28% (above 15% threshold)

RECOMMENDED: Schedule account review with CSM manager
```

## Related Skills

- `csm/case-summarization` - Summarize case details for sentiment context
- `csm/chat-recommendation` - Use sentiment to calibrate chat response tone
- `csm/email-recommendation` - Adjust email tone based on sentiment findings
- `csm/activity-response` - Generate sentiment-aware activity responses
- `reporting/customer-satisfaction` - CSAT reporting and trend analysis
