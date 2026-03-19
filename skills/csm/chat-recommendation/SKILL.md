---
name: chat-recommendation
version: 1.0.0
description: Generate recommended chat responses for CSM agents based on case context, knowledge base matches, customer history, and similar resolved cases
author: Happy Technologies LLC
tags: [csm, chat, recommendation, agent-assist, knowledge-base, customer-service]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Read-Record
  rest:
    - /api/now/table/sn_customerservice_case
    - /api/now/table/interaction
    - /api/now/table/kb_knowledge
    - /api/now/table/sys_journal_field
    - /api/now/table/customer_account
    - /api/now/table/csm_consumer
  native:
    - Bash
complexity: intermediate
estimated_time: 3-10 minutes
---

# Chat Recommendation

## Overview

This skill generates context-aware chat response recommendations for Customer Service Management (CSM) agents during live chat interactions. It helps you:

- Analyze the current case context including category, product, and customer tier
- Search the knowledge base for relevant articles matching the customer's issue
- Review similar resolved cases for proven response patterns and solutions
- Retrieve customer history to personalize recommendations
- Generate professional, empathetic, and accurate chat replies for agent use

**When to use:** When a CSM agent is handling a live chat or messaging interaction and needs quick, contextually appropriate response suggestions. Also useful for training new agents or building response templates.

## Prerequisites

- **Roles:** `sn_customerservice_agent`, `sn_customerservice_manager`, or `csm_admin`
- **Access:** Read access to `sn_customerservice_case`, `interaction`, `kb_knowledge`, `sys_journal_field`, `customer_account`, and `csm_consumer` tables
- **Knowledge:** Familiarity with your organization's CSM knowledge base structure and chat interaction workflows
- **Configuration:** Chat channel should be enabled in CSM workspace; knowledge bases should be populated with current articles

## Procedure

### Step 1: Retrieve Current Case and Interaction Context

Fetch the active case details and the current chat interaction to understand what the customer is asking about.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Read-Record
Parameters:
  table_name: sn_customerservice_case
  sys_id: [case_sys_id]
  fields: number,short_description,description,state,priority,category,subcategory,contact,account,consumer,product,asset,assigned_to,assignment_group,opened_at,contact_type,resolution_code,escalation
```

Retrieve the active chat interaction:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=<case_sys_id>^channel=chat^state=2^ORDERBYDESCopened_at
  fields: sys_id,number,channel,state,opened_at,short_description,assigned_to,direction
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case/{case_sys_id}?sysparm_fields=number,short_description,description,state,priority,category,subcategory,contact,account,consumer,product,assigned_to,assignment_group,opened_at,contact_type,escalation&sysparm_display_value=true

GET /api/now/table/interaction?sysparm_query=parent=<case_sys_id>^channel=chat^state=2^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,channel,state,opened_at,short_description,assigned_to&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Customer History and Account Context

Understand the customer's history, tier, and previous interactions to personalize responses.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_account
  query: sys_id=[account_sys_id]
  fields: sys_id,name,number,customer_tier,industry,notes,phone,account_code
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: csm_consumer
  query: sys_id=[consumer_sys_id]
  fields: sys_id,name,email,phone,title,preferred_language,timezone
  limit: 1
```

Retrieve the customer's recent case history:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: consumer=[consumer_sys_id]^sys_id!=<current_case_sys_id>^ORDERBYDESCopened_at
  fields: number,short_description,state,category,resolution_code,resolution_notes,opened_at,closed_at
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/customer_account/{account_sys_id}?sysparm_fields=name,number,customer_tier,industry,notes&sysparm_display_value=true

GET /api/now/table/csm_consumer/{consumer_sys_id}?sysparm_fields=name,email,phone,preferred_language,timezone&sysparm_display_value=true

GET /api/now/table/sn_customerservice_case?sysparm_query=consumer=<consumer_sys_id>^sys_id!=<current_case_sys_id>^ORDERBYDESCopened_at&sysparm_fields=number,short_description,state,category,resolution_code,resolution_notes&sysparm_limit=5&sysparm_display_value=true
```

### Step 3: Search Knowledge Base for Relevant Articles

Query the knowledge base using case keywords, category, and product to find applicable solutions.

**Using MCP:**
```
Tool: SN-NL-Search
Parameters:
  query: [short_description + category + product keywords]
  table: kb_knowledge
  limit: 5
```

For structured queries:
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^kb_category.label=[case_category]^textLIKE[key_terms]^ORshort_descriptionLIKE[key_terms]
  fields: sys_id,number,short_description,text,kb_category,author,sys_updated_on,rating
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^short_descriptionLIKE<key_terms>^ORtextLIKE<key_terms>&sysparm_fields=sys_id,number,short_description,text,kb_category,rating&sysparm_limit=5&sysparm_display_value=true
```

### Step 4: Find Similar Resolved Cases

Search for previously resolved cases with similar characteristics for proven solutions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=[case_category]^subcategory=[case_subcategory]^stateIN6,7^resolution_codeISNOTEMPTY^ORDERBYDESCclosed_at
  fields: number,short_description,resolution_code,resolution_notes,category,subcategory,product,closed_at
  limit: 5
```

For broader matching using natural language:
```
Tool: SN-NL-Search
Parameters:
  query: [short_description of current case]
  table: sn_customerservice_case
  filter: stateIN6,7
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sn_customerservice_case?sysparm_query=category=<category>^subcategory=<subcategory>^stateIN6,7^resolution_codeISNOTEMPTY^ORDERBYDESCclosed_at&sysparm_fields=number,short_description,resolution_code,resolution_notes,product&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Retrieve Recent Chat Messages

Pull the recent conversation messages to understand the current flow and avoid repeating questions.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=<case_sys_id>^element=comments^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

Also check for any live chat transcript entries:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction_entry
  query: interaction=<interaction_sys_id>^ORDERBYsys_created_on
  fields: sys_id,message,type,sys_created_on,sys_created_by
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=<case_sys_id>^element=comments^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=20

GET /api/now/table/interaction_entry?sysparm_query=interaction=<interaction_sys_id>^ORDERBYsys_created_on&sysparm_fields=message,type,sys_created_on,sys_created_by&sysparm_limit=50
```

### Step 6: Generate Chat Response Recommendations

Based on all gathered context, assemble recommended responses. Structure recommendations by scenario:

```
=== CHAT RESPONSE RECOMMENDATIONS ===
Case: [number] | Customer: [name] | Tier: [tier]
Category: [category] / [subcategory] | Product: [product]

CUSTOMER CONTEXT:
- Account Tier: [tier] (adjust formality accordingly)
- Previous Cases: [count] ([resolved_count] resolved)
- Preferred Language: [language]
- Known Issue: [yes/no - if matches known KB article]

RECOMMENDED GREETING:
"Hello [contact_name], thank you for reaching out. I can see you're
contacting us about [short_description]. I'm here to help you with that."

RECOMMENDED RESPONSE (Based on KB Article [kb_number]):
"I understand you're experiencing [issue_description]. Based on our
documentation, here are the steps to resolve this:
1. [step_1 from KB article]
2. [step_2 from KB article]
3. [step_3 from KB article]
Would you like me to walk you through these steps?"

ALTERNATIVE RESPONSE (Based on Similar Case [case_number]):
"I've seen similar cases where [resolution_summary]. Let me check
if the same solution applies to your situation. Could you confirm
[clarifying_question]?"

ESCALATION RESPONSE (if needed):
"I want to make sure this gets the attention it deserves. I'm going
to bring in a specialist from our [team_name] team who can provide
more detailed assistance. Please hold for just a moment."

CLOSING RESPONSE:
"Is there anything else I can help you with today? If this issue
comes up again, you can reference KB article [kb_number] in our
support portal for quick self-service."
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language search for KB articles and similar cases |
| `SN-Query-Table` | Structured queries for case history, interactions, KB articles |
| `SN-Read-Record` | Retrieve a single case or interaction record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_customerservice_case` | GET | Query current and historical cases |
| `/api/now/table/interaction` | GET | Retrieve chat interaction details |
| `/api/now/table/interaction_entry` | GET | Pull chat transcript messages |
| `/api/now/table/kb_knowledge` | GET | Search knowledge base articles |
| `/api/now/table/sys_journal_field` | GET | Retrieve comments and work notes |
| `/api/now/table/customer_account` | GET | Customer account and tier info |
| `/api/now/table/csm_consumer` | GET | Consumer profile and preferences |

## Best Practices

- **Match tone to customer tier:** Premium/Gold tier customers should receive more personalized and formal responses; adjust language accordingly
- **Reference specific KB articles:** Always include KB article numbers so agents can share links with customers
- **Avoid jargon:** Recommendations should use customer-friendly language; reserve technical details for internal work notes
- **Acknowledge repeat contacts:** If the customer has prior cases on the same topic, acknowledge the history and apologize for recurring issues
- **Suggest self-service options:** When appropriate, point customers to portal resources for future similar issues
- **Keep messages concise:** Chat responses should be 2-4 sentences maximum; break longer instructions into multiple messages
- **Provide multiple options:** Offer 2-3 response variations so agents can choose the most appropriate one
- **Use customer's name:** Always personalize greetings and responses with the customer's first name

## Troubleshooting

### "No KB articles found"

**Cause:** Knowledge base may not have articles matching the case category or product
**Solution:** Broaden the search by using only key terms from the short_description. Try `SN-NL-Search` with natural language. Also check if articles exist in a different knowledge base using `kb_knowledge_baseLIKE[name]`.

### "No similar resolved cases found"

**Cause:** Category or subcategory may not have enough resolved case history
**Solution:** Broaden the query by removing subcategory filter. Try matching on product alone, or use `short_descriptionLIKE[key_terms]` instead of exact category match.

### "Chat transcript is empty"

**Cause:** Interaction entry records may use a different table or the chat has not started
**Solution:** Check `live_message` table as an alternative: `sysparm_query=group=<interaction_sys_id>^ORDERBYsys_created_on`. Also verify the interaction state is active (state=2).

### "Customer history not loading"

**Cause:** Consumer sys_id may differ from the contact sys_id
**Solution:** First query `customer_contact` to get the consumer reference, then use that to query case history. The `consumer` field on the case links to `csm_consumer`, while `contact` links to `customer_contact`.

## Examples

### Example 1: Product Return Inquiry Chat Recommendation

**Scenario:** Customer initiates chat about returning a defective product.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0078901
  fields: sys_id,number,short_description,description,state,category,subcategory,product,contact,account,consumer
  limit: 1
```

**Step 2 - Search KB:**
```
Tool: SN-NL-Search
Parameters:
  query: product return defective item return policy
  table: kb_knowledge
  limit: 3
```

**Step 3 - Find similar resolved cases:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: category=Returns^subcategory=Defective Product^stateIN6,7^ORDERBYDESCclosed_at
  fields: number,short_description,resolution_code,resolution_notes
  limit: 3
```

**Generated Recommendation:**
```
CHAT RECOMMENDATION - CS0078901
Customer: John Martinez | Tier: Silver | Product: Widget Pro X

GREETING:
"Hi John, I'm sorry to hear about the issue with your Widget Pro X.
I'd be happy to help you with the return process."

RECOMMENDED RESPONSE (KB0045678 - Product Return Policy):
"For defective products within the warranty period, we offer a full
replacement or refund. I can initiate the return for you right now.
Could you confirm the order number or the date of purchase?"

FOLLOW-UP:
"I've initiated return RMA-2026-0456 for your Widget Pro X. You'll
receive a prepaid shipping label at john.m@email.com within the
next hour. Once we receive the item, your replacement will ship
within 2 business days."
```

### Example 2: Billing Dispute Chat with Escalation

**Scenario:** Repeat customer with billing issue, previous unresolved case exists.

**Step 1 - Get case and customer history:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: number=CS0079200
  fields: sys_id,number,short_description,state,category,contact,account,consumer,priority,escalation
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_customerservice_case
  query: consumer=[consumer_sys_id]^category=Billing^ORDERBYDESCopened_at
  fields: number,short_description,state,resolution_code,opened_at
  limit: 5
```

**Generated Recommendation:**
```
CHAT RECOMMENDATION - CS0079200
Customer: Lisa Chen | Tier: Gold | Category: Billing

!! ATTENTION: Customer has 2 prior billing cases in last 90 days,
   including 1 unresolved (CS0077500). Handle with care. !!

GREETING:
"Hello Lisa, thank you for contacting us. I can see this is regarding
a billing concern, and I want to make sure we get this fully resolved
for you today."

EMPATHY RESPONSE (repeat issue detected):
"I understand this is frustrating, especially since you've had to
reach out about billing before. I sincerely apologize for the
inconvenience. Let me personally ensure this is addressed properly."

ESCALATION (if needed):
"Lisa, I want to make sure you get the best possible support on this.
I'm connecting you with our billing specialist team lead who has the
authority to review and adjust your account immediately."
```

## Related Skills

- `csm/case-summarization` - Summarize full case context before generating recommendations
- `csm/email-recommendation` - Generate email responses instead of chat responses
- `csm/sentiment-analysis` - Analyze customer sentiment to calibrate response tone
- `csm/activity-response` - Generate internal work notes and status updates
- `knowledge/article-search` - Deep knowledge base search techniques
