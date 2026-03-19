---
name: chat-reply-recommendation
version: 1.0.0
description: Generate recommended replies for HR agents handling employee inquiries via chat, considering HR policies, case history, and confidentiality requirements
author: Happy Technologies LLC
tags: [hrsd, chat, reply, recommendation, agent-assist, hr-policy, confidentiality]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_hr_core_case
    - /api/now/table/sn_hr_core_task
    - /api/now/table/sn_hr_core_profile
    - /api/now/table/sn_hr_le_case_type
    - /api/now/table/interaction
    - /api/now/table/sys_journal_field
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_cs_conversation
    - /api/now/table/hr_category
  native:
    - Bash
complexity: intermediate
estimated_time: 3-10 minutes
---

# HR Chat Reply Recommendation

## Overview

This skill generates context-aware recommended replies for HR agents handling live employee inquiries via chat or Virtual Agent conversations. It helps you:

- Analyze the current chat conversation context and employee inquiry
- Retrieve relevant HR case history for the employee
- Look up applicable HR policies and knowledge articles
- Generate professional, policy-compliant reply suggestions
- Enforce confidentiality boundaries based on data classification
- Adapt tone and content to the inquiry type (benefits, payroll, leave, etc.)

**When to use:** When an HR agent needs quick, accurate reply suggestions during a live chat interaction with an employee, or when building automated response workflows for common HR inquiries.

## Prerequisites

- **Roles:** `sn_hr_core.case_writer`, `sn_hr_core.agent`, or `sn_hr_core.manager`
- **Plugins:** `com.sn_hr_service_delivery` (HR Service Delivery), `com.glide.cs.chatbot` (Virtual Agent)
- **Access:** Read access to `sn_hr_core_case`, `sn_hr_core_profile`, `interaction`, `kb_knowledge`, and `sys_cs_conversation`
- **Knowledge:** Familiarity with organization HR policies, confidentiality tiers, and chat workflows

## Procedure

### Step 1: Retrieve Active Chat Conversation

Fetch the current chat session details to understand the conversation context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: sys_id=[conversation_sys_id]
  fields: sys_id,state,requester,opened_at,topic,queue,language,channel,live_agent,summary
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_conversation?sysparm_query=sys_id=[conversation_sys_id]&sysparm_fields=sys_id,state,requester,opened_at,topic,queue,language,channel,live_agent,summary&sysparm_display_value=true&sysparm_limit=1
```

### Step 2: Retrieve Conversation Messages

Pull the message history from the current chat session for full context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_message
  query: group=[conversation_sys_id]^ORDERBYsys_created_on
  fields: sys_id,body,typed_by,sys_created_on,is_hidden,formatting_type
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_message?sysparm_query=group=[conversation_sys_id]^ORDERBYsys_created_on&sysparm_fields=sys_id,body,typed_by,sys_created_on,is_hidden,formatting_type&sysparm_display_value=true&sysparm_limit=100
```

### Step 3: Retrieve Employee HR Profile

Fetch the requesting employee's HR profile for context about their role, department, and employment details.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_profile
  query: user=[requester_sys_id]
  fields: sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building,employee_type,benefits_eligible
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_profile?sysparm_query=user=[requester_sys_id]&sysparm_fields=sys_id,user,department,location,employment_type,hire_date,manager,job_title,cost_center,building,employee_type,benefits_eligible&sysparm_display_value=true&sysparm_limit=1
```

### Step 4: Check Employee Case History

Look up recent HR cases for the employee to understand prior interactions and avoid redundant questions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_core_case
  query: subject_person=[requester_sys_id]^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,hr_service,opened_at,closed_at,resolution_code,assignment_group,priority
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_core_case?sysparm_query=subject_person=[requester_sys_id]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,short_description,state,hr_service,opened_at,closed_at,resolution_code,assignment_group,priority&sysparm_display_value=true&sysparm_limit=10
```

### Step 5: Search Relevant HR Knowledge Articles

Find applicable policy documents and knowledge articles based on the inquiry topic.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [employee_inquiry_topic]
  table: kb_knowledge
  limit: 5
```

Alternatively, use structured query for specific HR categories:

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: kb_category.labelLIKE[topic]^workflow_state=published^kb_knowledge_base.titleLIKEHR
  fields: sys_id,short_description,text,kb_category,number,valid_to,sys_updated_on
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=kb_category.labelLIKEbenefits^workflow_state=published^kb_knowledge_base.titleLIKEHR&sysparm_fields=sys_id,short_description,text,kb_category,number,valid_to&sysparm_display_value=true&sysparm_limit=5
```

### Step 6: Identify Case Type and Confidentiality Level

Determine the confidentiality requirements for the inquiry type to ensure reply complies with data handling policies.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: nameLIKE[inquiry_topic]^active=true
  fields: sys_id,name,description,hr_service_center,fulfillment_group,confidentiality,data_classification,sla
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sn_hr_le_case_type?sysparm_query=nameLIKEbenefits^active=true&sysparm_fields=sys_id,name,description,hr_service_center,fulfillment_group,confidentiality,data_classification,sla&sysparm_display_value=true&sysparm_limit=5
```

### Step 7: Generate Reply Recommendations

Based on collected context, compose reply suggestions. Structure recommendations by tone and detail level:

```
=== RECOMMENDED REPLIES ===

Context: Employee asking about benefits enrollment deadline
Employee: Jane Smith | Engineering | Hired: 2021-03-15
Confidentiality Level: Standard
Related KB: KB0045123 - Annual Benefits Enrollment Guide

--- Reply Option 1: Direct Answer ---
"Hi Jane, thanks for reaching out! The annual benefits enrollment
window for 2026 runs from April 1 through April 30. You can make
changes through the Employee Self-Service portal under Benefits >
Annual Enrollment. Would you like me to send you a direct link?"

--- Reply Option 2: Detailed with Policy Reference ---
"Hi Jane, great question! Our annual open enrollment period is
April 1-30, 2026. During this window you can update your medical,
dental, vision, and life insurance selections. Changes take effect
May 1. For the full guide, see KB0045123 in the HR Knowledge Base.
Do you have a specific benefit you'd like help with?"

--- Reply Option 3: Escalation Path ---
"Hi Jane, I can help with general enrollment questions. For your
specific situation as a benefits-eligible employee in Engineering,
I'd recommend connecting with the Benefits Administration team
who can review your current elections. Shall I create a case
for a benefits specialist to reach out to you?"

--- CONFIDENTIALITY NOTES ---
- Do NOT reference salary, compensation, or disciplinary history
- Do NOT disclose other employees' information
- Verify identity before sharing personal benefits details
```

### Step 8: Log the Recommendation

Document the recommended reply in the case work notes for audit purposes.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_hr_core_case
  sys_id: [case_sys_id]
  work_notes: "Chat reply recommendation generated. Topic: Benefits Enrollment. KB referenced: KB0045123. Confidentiality level: Standard."
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Retrieve conversations, messages, cases, profiles, KB articles |
| `SN-NL-Search` | Natural language search for relevant knowledge articles |
| `SN-Get-Record` | Fetch a single record by sys_id for detailed review |
| `SN-Add-Work-Notes` | Log recommendation details on the case record |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sys_cs_conversation` | GET | Active chat session details |
| `/api/now/table/sys_cs_message` | GET | Chat message history |
| `/api/now/table/sn_hr_core_case` | GET | Employee case history |
| `/api/now/table/sn_hr_core_profile` | GET | Employee HR profile |
| `/api/now/table/kb_knowledge` | GET | HR knowledge articles |
| `/api/now/table/sn_hr_le_case_type` | GET | Case type and confidentiality config |

## Best Practices

- **Respect confidentiality tiers:** Always check the case type's `confidentiality` and `data_classification` fields before including sensitive details in a reply
- **Use employee context wisely:** Reference department-specific policies when applicable but never expose other employees' data
- **Verify KB article currency:** Check `valid_to` and `sys_updated_on` fields to ensure referenced policies are current
- **Offer escalation paths:** Always include an option to escalate to a specialist COE when the inquiry is complex
- **Match tone to channel:** Chat replies should be conversational but professional; avoid overly formal language
- **Avoid medical or legal advice:** For inquiries about FMLA, ADA accommodations, or disciplinary matters, recommend specialist consultation
- **Include self-service links:** When applicable, guide employees to the Employee Service Center for common tasks

## Troubleshooting

### "No conversation messages found"

**Cause:** Messages may be stored in a different child table or the conversation ID format differs
**Solution:** Check `sys_cs_message` with `conversation=[conversation_sys_id]` as an alternative query field

### "Knowledge articles not relevant"

**Cause:** HR knowledge base may use a different naming convention or category structure
**Solution:** Query `kb_knowledge_base` first to identify the correct HR knowledge base sys_id, then filter articles by that base

### "Employee profile returns empty"

**Cause:** Contractors or contingent workers may not have HR profiles
**Solution:** Fall back to `sys_user` table for basic user details and note the limited profile context

### "Confidentiality level not set on case type"

**Cause:** Not all case types have confidentiality classifications configured
**Solution:** Default to the highest confidentiality tier (restricted) when the classification is missing

## Examples

### Example 1: Payroll Inquiry Reply

**Input:** Employee asks "When will I receive my bonus payment?"

```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: short_descriptionLIKEbonus^ORshort_descriptionLIKEpayroll schedule^workflow_state=published^kb_knowledge_base.titleLIKEHR
  fields: sys_id,short_description,text,number
  limit: 3
```

**Recommended Reply:**
"Hi! Bonus payments are typically processed in the next regular payroll cycle after approval. For the current cycle, payments are scheduled for March 31. You can check your payment status in Employee Self-Service under Pay > Payment History. If you need details about your specific bonus, I can connect you with the Payroll team."

### Example 2: Leave of Absence Inquiry

**Input:** Employee asks "How do I request parental leave?"

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_hr_le_case_type
  query: nameLIKEparental leave^active=true
  fields: sys_id,name,description,hr_service_center,fulfillment_group,confidentiality
  limit: 1
```

**Recommended Reply:**
"Congratulations! To request parental leave, navigate to Employee Self-Service > Time Off > Leave of Absence and select 'Parental Leave.' This will create a case with our Leave Administration team who will guide you through eligibility, documentation, and timeline. Our standard parental leave policy is outlined in KB0078234. Would you like me to start the request for you?"

### Example 3: Sensitive Inquiry Handling

**Input:** Employee asks about filing a workplace complaint

**Confidentiality Check Result:** Restricted

**Recommended Reply:**
"Thank you for reaching out. I want to make sure you're connected with the right team to handle this confidentially. I'll create a case with our Employee Relations team, and a specialist will contact you directly within 24 hours. All communications will be handled with strict confidentiality. Is there a preferred time or contact method for them to reach you?"

## Related Skills

- `hrsd/case-summarization` - Summarize HR case context for agent reference
- `hrsd/sentiment-analysis` - Analyze employee sentiment during interactions
- `hrsd/persona-assistant` - Personalized HR assistance based on employee role
- `knowledge/duplicate-detection` - Avoid recommending duplicate KB articles
- `itsm/natural-language-queries` - NL search patterns for knowledge retrieval
