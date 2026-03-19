---
name: email-recommendation
version: 1.0.0
description: Generate professional email responses for customer service cases by analyzing case details, customer sentiment, communication history, and knowledge base articles
author: Happy Technologies LLC
tags: [csm, email, recommendation, response-generation, customer-service, communication]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/sys_email
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_journal_field
    - /api/now/table/customer_account
    - /api/now/table/customer_contact
    - /api/now/table/sn_customerservice_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Email Recommendation

## Overview

This skill generates professional, contextually appropriate email response drafts for Customer Service Management (CSM) cases. It helps you:

- Analyze the full case context, including issue description, category, priority, and current state
- Review the email communication history to maintain conversation continuity
- Search the knowledge base for relevant solutions and reference materials
- Assess customer sentiment from previous communications to calibrate tone
- Generate templated or custom email drafts with appropriate structure, empathy, and resolution content
- Provide multiple response variations for different scenarios (acknowledgment, update, resolution, escalation)

**When to use:** When a CSM agent needs to compose a professional email response to a customer inquiry, provide a status update, share a resolution, or handle an escalation via email.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `sys_email`, `kb_knowledge`, `sys_journal_field`, `customer_account`, `customer_contact`, and `sn_customerservice_sla` tables
- **Knowledge:** Familiarity with your organization's email communication guidelines, branding standards, and CSM workflows
- **Configuration:** Email notifications and templates should be configured in CSM; outbound email enabled

## Procedure

### Step 1: Retrieve Case Details and Current State

Fetch the full case record to understand what the customer is contacting about.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,opened_by,resolved_at,resolution_code,resolution_notes,escalation,severity,sla_due,contact_type,reassignment_count,reopen_count
```

If searching by case number:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0012345
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,contact,account,consumer,product,assigned_to,assignment_group,opened_at,resolution_code,resolution_notes,escalation,sla_due
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=number=CS0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,category,subcategory,contact,account,consumer,product,assigned_to,assignment_group,opened_at,resolution_code,resolution_notes,escalation,sla_due&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Review Email Communication History

Retrieve all previous emails on this case to understand the conversation thread and avoid repeating information.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=<case_sys_id>^ORDERBYDESCsys_created_on
  fields: sys_id,subject,type,recipients,sys_created_on,sys_created_by,body_text,direct,importance,content_type
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=<case_sys_id>^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,subject,type,recipients,sys_created_on,sys_created_by,body_text,direct,importance&sysparm_limit=20&sysparm_display_value=true
```

### Step 3: Get Customer and Account Information

Retrieve the contact and account details for personalization and tone calibration.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_contact
  query: sys_id=[contact_sys_id]
  fields: sys_id,name,first_name,last_name,email,phone,title,account,preferred_contact_method,timezone
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_id=[account_sys_id]
  fields: sys_id,name,customer_tier,industry,account_code,notes
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/customer_contact/{contact_sys_id}?sysparm_fields=name,first_name,last_name,email,phone,title,preferred_contact_method,timezone&sysparm_display_value=true

GET /api/now/table/customer_account/{account_sys_id}?sysparm_fields=name,customer_tier,industry,account_code&sysparm_display_value=true
```

### Step 4: Check SLA Status

Determine SLA compliance to decide urgency and tone of the response.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<case_sys_id>^stage!=cancelled
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,pause_duration,business_percentage
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_sla?sysparm_query=task=<case_sys_id>^stage!=cancelled&sysparm_fields=sla,stage,has_breached,planned_end_time,percentage,business_percentage&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Search Knowledge Base for Solutions

Find relevant KB articles to reference or include in the email response.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [short_description + key terms from description]
  table: kb_knowledge
  limit: 5
```

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^short_descriptionLIKE[key_terms]^ORtextLIKE[key_terms]
  fields: sys_id,number,short_description,text,kb_category,author,sys_updated_on,rating
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE<key_terms>&sysparm_fields=number,short_description,text,kb_category,rating&sysparm_limit=5&sysparm_display_value=true
```

### Step 6: Retrieve Work Notes for Internal Context

Pull internal work notes so the email response reflects the latest internal analysis.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=10
```

### Step 7: Generate Email Response Recommendations

Assemble the gathered information into structured email drafts. Provide multiple variants based on the case state.

```
=== EMAIL RESPONSE RECOMMENDATIONS ===
Case: [number] | Customer: [first_name] [last_name] | Tier: [tier]
Category: [category] / [subcategory] | State: [state]
SLA Status: [on_track/at_risk/breached]
Email Thread Length: [count] messages

--- OPTION A: ACKNOWLEDGMENT EMAIL ---
Subject: Re: [original_subject] - Case [number] Received

Dear [first_name],

Thank you for contacting [company_name] support. We have received
your request regarding [short_description] and created case [number]
for tracking purposes.

Our [assignment_group] team is reviewing your request and you can
expect an initial response within [sla_target]. In the meantime,
you may find the following resource helpful:
- [KB article title]: [portal_link]

If you need immediate assistance, please don't hesitate to call us
at [support_phone] or start a live chat session through the portal.

Best regards,
[agent_name]
[assignment_group]

--- OPTION B: STATUS UPDATE EMAIL ---
Subject: Re: [original_subject] - Case [number] Update

Dear [first_name],

I wanted to provide you with an update on your case [number]
regarding [short_description].

[Summary of investigation findings from work notes]

Our next steps are:
1. [next_action_1]
2. [next_action_2]

We expect to have [resolution/further update] by [date]. I will
keep you informed of any developments.

Please let me know if you have any questions or additional
information to share.

Best regards,
[agent_name]

--- OPTION C: RESOLUTION EMAIL ---
Subject: Re: [original_subject] - Case [number] Resolved

Dear [first_name],

I'm pleased to let you know that your case [number] regarding
[short_description] has been resolved.

Resolution Summary:
[resolution_notes]

Root Cause: [root_cause if applicable]
Steps Taken: [summary of actions]

For future reference, you can find detailed instructions in our
knowledge base article: [KB article number and title]

If this issue recurs or you have any other questions, please don't
hesitate to reach out. You can reopen this case by simply replying
to this email.

Thank you for your patience, and we appreciate your business.

Best regards,
[agent_name]

--- OPTION D: ESCALATION NOTIFICATION EMAIL ---
Subject: Re: [original_subject] - Case [number] Escalated

Dear [first_name],

I want to let you know that your case [number] has been escalated
to our [escalation_group] team for specialized attention.

Your case is being prioritized and [escalation_contact] will be
reaching out to you directly within [timeframe]. You can also reach
them at [escalation_email/phone].

We understand the urgency of this matter and are committed to
resolving it as quickly as possible.

Best regards,
[agent_name]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language search for KB articles matching the customer issue |
| `SN-Query-Table` | Structured queries for emails, case history, SLA status |
| `SN-Read-Record` | Retrieve a single case or contact record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query case details |
| `/api/now/table/sys_email` | GET | Retrieve email communication history |
| `/api/now/table/kb_knowledge` | GET | Search knowledge base articles |
| `/api/now/table/sys_journal_field` | GET | Pull work notes for internal context |
| `/api/now/table/customer_account` | GET | Account tier and details |
| `/api/now/table/customer_contact` | GET | Contact name, email, preferences |
| `/api/now/table/sn_customerservice_sla` | GET | SLA status and breach info |

## Best Practices

- **Maintain thread continuity:** Always use "Re:" prefix and reference the case number in the subject line to keep email threading intact
- **Match formality to tier:** Gold/Platinum tier customers warrant more formal, personalized language; standard tiers can be professional but concise
- **Acknowledge delays:** If SLA is at risk or breached, proactively acknowledge the delay and apologize before providing the update
- **Include self-service links:** Reference KB articles and portal links so customers can find answers independently in the future
- **Avoid internal details:** Never expose internal work notes, assignment changes, or system details in customer-facing emails
- **Use clear next steps:** Every email should end with a clear indication of what happens next and when
- **Check previous emails:** Always review the email thread to avoid repeating questions or information already provided
- **Proofread for tone:** Ensure the response reads as empathetic and helpful, especially for frustrated customers or escalated cases
- **Consider timezone:** Schedule email sends during the customer's business hours when possible

## Troubleshooting

### "No email history found"

**Cause:** Emails may be stored under a different target record or the case was created through a non-email channel
**Solution:** Try querying with `target_table=sn_customerservice_case^instance=<case_sys_id>`. Also check if the original email created a separate record using `sysparm_query=subject_LIKE[case_number]`.

### "Customer contact email is missing"

**Cause:** The contact record may not have an email address populated
**Solution:** Check the `csm_consumer` record for email. Also check `sys_user` if the contact is an internal user. Fall back to the `opened_by` email if no contact email is available.

### "SLA data not available"

**Cause:** SLA definitions may not be configured for this case type or category
**Solution:** Check if SLA exists by querying `contract_sla` table for the case's assignment group and priority. If no SLA is defined, omit SLA references from the email and use general timeframes.

### "KB articles not relevant"

**Cause:** Search terms may be too specific or KB may not cover this topic
**Solution:** Broaden search terms progressively: start with the exact short_description, then try individual keywords, then try the category name alone. Check multiple knowledge bases if your organization uses separate bases per product.

## Examples

### Example 1: Initial Response to Software License Issue

**Scenario:** Customer emails about a software license activation failure.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0081234
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,contact,account,product,assigned_to,assignment_group,sla_due
  limit: 1
```

**Step 2 - Search KB:**
```
Tool: SN-NL-Search
Parameters:
  query: software license activation failure error code
  table: kb_knowledge
  limit: 3
```

**Generated Email:**
```
Subject: Re: License Activation Error - Case CS0081234

Dear Sarah,

Thank you for contacting TechCorp Support regarding the license
activation issue with DataSync Pro. I've created case CS0081234
to track your request.

I found a knowledge base article that addresses the most common
activation errors:
- KB0023456: "Resolving DataSync Pro License Activation Errors"
  Link: https://support.techcorp.com/kb/KB0023456

Could you try the steps in Section 3 of that article? If the issue
persists, please reply with:
1. The exact error message or error code displayed
2. Your license key (last 4 characters only)
3. The operating system version

I'm targeting to have this resolved for you by March 20th.

Best regards,
Alex Thompson
Software Support Team
```

### Example 2: Escalation Email for Critical Service Outage

**Scenario:** Customer's P1 case about a service outage needs escalation notification.

**Step 1 - Get case and SLA:**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,state,priority,escalation,contact,account,assigned_to,sla_due,opened_at
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_sla
  query: task=<case_sys_id>^stage!=cancelled
  fields: sla,stage,has_breached,planned_end_time,percentage
  limit: 3
```

**Generated Email:**
```
Subject: URGENT: Case CS0082001 Escalated - Service Outage

Dear Michael,

I want to personally update you on your critical case CS0082001
regarding the API gateway outage affecting your production systems.

Your case has been escalated to our Senior Engineering team and is
receiving immediate priority attention. Here is your escalation
contact information:

  Escalation Lead: Jennifer Walsh, Senior Platform Engineer
  Direct Line: +1 (555) 012-3456
  Email: j.walsh@techcorp.com

Current Status:
- Our team has identified the affected components
- A hotfix is being developed and tested
- Estimated resolution: within the next 2 hours

We will provide updates every 30 minutes until this is resolved.
You can also monitor real-time status at status.techcorp.com.

We sincerely apologize for the impact this is having on your
operations and are fully committed to restoring service as
quickly as possible.

Best regards,
David Martinez
Critical Incident Manager
```

## Related Skills

- `csm/case-summarization` - Summarize case details before drafting an email
- `csm/chat-recommendation` - Generate chat responses instead of emails
- `csm/sentiment-analysis` - Assess customer sentiment to calibrate email tone
- `csm/resolution-notes` - Generate resolution documentation for closure emails
- `knowledge/article-search` - Deep knowledge base search for email references
